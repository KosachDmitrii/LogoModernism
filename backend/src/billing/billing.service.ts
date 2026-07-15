import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@logo-platform/database';
import type {
  BillingOverview,
  BillingSubscriptionStatus,
  Plan,
} from '@logo-platform/shared';
import type { TenantScope } from '../auth/tenant-context';
import { UsageService } from '../usage/usage.service';
import { LemonSqueezyClient } from './lemon-squeezy.client';

type LemonWebhook = {
  meta?: {
    event_name?: string;
    custom_data?: {
      organization_id?: string;
      checkout_session_id?: string;
      nonce?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      store_id?: number | string;
      customer_id?: number | string;
      order_id?: number | string;
      product_id?: number | string;
      variant_id?: number | string;
      status?: string;
      renews_at?: string | null;
      ends_at?: string | null;
      updated_at?: string | null;
    };
  };
};
type CheckoutCustomData = NonNullable<
  NonNullable<LemonWebhook['meta']>['custom_data']
>;
type SubscriptionRow = {
  organizationId: string;
  providerCustomerId: string | null;
  status: BillingSubscriptionStatus;
  renewsAt: Date | null;
  endsAt: Date | null;
  providerUpdatedAt: Date | null;
};
type CheckoutRow = {
  id: string;
  organizationId: string;
};

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    String((error as { code?: unknown }).code) === '23505'
  );
}

@Injectable()
export class BillingService {
  constructor(
    private readonly lemon: LemonSqueezyClient,
    private readonly usage: UsageService,
  ) {}

  async overview(tenant: TenantScope): Promise<BillingOverview> {
    const [organization, membership, subscription, usage] = await Promise.all([
      db.maybeOne<{ plan: Plan }>('SELECT plan FROM organizations WHERE id = $1', [
        tenant.organizationId,
      ]),
      db.maybeOne<{ role: string }>(
        `SELECT role FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [tenant.organizationId, tenant.userId],
      ),
      db.maybeOne<SubscriptionRow>(
        'SELECT * FROM billing_subscriptions WHERE organization_id = $1',
        [tenant.organizationId],
      ),
      this.usage.summary(tenant.organizationId),
    ]);
    if (!organization || !membership) throw new NotFoundException('Organization not found');
    return {
      plan: organization.plan,
      subscriptionStatus: subscription?.status ?? 'INACTIVE',
      renewsAt: subscription?.renewsAt?.toISOString(),
      endsAt: subscription?.endsAt?.toISOString(),
      usage,
      canManageBilling: membership.role === 'OWNER' || membership.role === 'ADMIN',
    };
  }

  async createCheckout(tenant: TenantScope, requestedPlan: Plan) {
    await this.assertBillingManager(tenant);
    if (requestedPlan !== 'PRO') {
      throw new BadRequestException('Only the PRO plan is available through self-service');
    }
    const variantId = this.variantForPlan(requestedPlan);
    const nonce = randomBytes(24).toString('base64url');
    const session = await db.one<{ id: string }>(
      `INSERT INTO billing_checkout_sessions (
         id, organization_id, requested_by, plan, variant_id, nonce_hash, expires_at
       ) VALUES ($1, $2, $3, $4::"Plan", $5, $6, $7)
       RETURNING id`,
      [
        randomUUID(),
        tenant.organizationId,
        tenant.userId,
        requestedPlan,
        variantId,
        sha256(nonce),
        new Date(Date.now() + 30 * 60_000),
      ],
    );
    try {
      const url = await this.lemon.createCheckout({
        variantId,
        organizationId: tenant.organizationId,
        checkoutSessionId: session.id,
        nonce,
      });
      return { url };
    } catch (error) {
      await db.query('DELETE FROM billing_checkout_sessions WHERE id = $1', [session.id])
        .catch(() => undefined);
      throw error;
    }
  }

  async customerPortal(tenant: TenantScope) {
    await this.assertBillingManager(tenant);
    const subscription = await db.maybeOne<SubscriptionRow>(
      'SELECT * FROM billing_subscriptions WHERE organization_id = $1',
      [tenant.organizationId],
    );
    if (!subscription?.providerCustomerId) {
      throw new NotFoundException('No billing customer exists for this organization');
    }
    return { url: await this.lemon.getCustomerPortalUrl(subscription.providerCustomerId) };
  }

  async processWebhook(
    rawBody: Buffer,
    eventHeader: string | undefined,
  ): Promise<{ status: 'processed' | 'ignored' | 'duplicate' }> {
    const payloadHash = sha256(rawBody);
    if (
      await db.maybeOne<{ id: string }>(
        'SELECT id FROM billing_webhook_events WHERE id = $1',
        [payloadHash],
      )
    ) {
      return { status: 'duplicate' };
    }

    let payload: LemonWebhook;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as LemonWebhook;
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }
    const eventName = payload.meta?.event_name;
    if (!eventName || (eventHeader && eventHeader !== eventName)) {
      throw new BadRequestException('Webhook event name mismatch');
    }
    const resourceId = payload.data?.id;
    const attributes = payload.data?.attributes;
    const configuredStore = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
    if (
      configuredStore &&
      attributes?.store_id != null &&
      String(attributes.store_id) !== configuredStore
    ) {
      throw new ForbiddenException('Webhook belongs to another store');
    }

    if (!eventName.startsWith('subscription_') || !resourceId || !attributes) {
      await db.query(
        `INSERT INTO billing_webhook_events (
           id, event_name, resource_id, status, processed_at
         ) VALUES ($1, $2, $3, 'IGNORED'::"BillingEventStatus", NOW())
         ON CONFLICT (id) DO NOTHING`,
        [payloadHash, eventName, resourceId ?? null],
      );
      return { status: 'ignored' };
    }

    const variantId = String(attributes.variant_id ?? '');
    const plan = this.planForVariant(variantId);
    if (!plan) throw new ForbiddenException('Unknown billing variant');
    const status = this.mapStatus(attributes.status);
    const providerUpdatedAt = asDate(attributes.updated_at) ?? new Date();
    const renewsAt = asDate(attributes.renews_at);
    const endsAt = asDate(attributes.ends_at);
    const existingSubscription = await db.maybeOne<SubscriptionRow>(
      'SELECT * FROM billing_subscriptions WHERE provider_subscription_id = $1',
      [resourceId],
    );
    const checkout = existingSubscription
      ? null
      : await this.validCheckout(payload.meta?.custom_data, plan, variantId);
    const organizationId =
      existingSubscription?.organizationId ?? checkout?.organizationId;
    if (!organizationId) throw new ForbiddenException('Webhook is not linked to a checkout');
    const effectivePlan = this.entitledPlan(plan, status, endsAt, providerUpdatedAt);

    try {
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO billing_webhook_events (id, event_name, resource_id, status)
           VALUES ($1, $2, $3, 'RECEIVED'::"BillingEventStatus")`,
          [payloadHash, eventName, resourceId],
        );
        const current = await tx.maybeOne<SubscriptionRow>(
          `SELECT * FROM billing_subscriptions
           WHERE organization_id = $1 FOR UPDATE`,
          [organizationId],
        );
        if (
          current?.providerUpdatedAt &&
          current.providerUpdatedAt.getTime() > providerUpdatedAt.getTime()
        ) {
          await tx.query(
            `UPDATE billing_webhook_events
             SET status = 'IGNORED'::"BillingEventStatus", processed_at = NOW()
             WHERE id = $1`,
            [payloadHash],
          );
          return;
        }
        await tx.query(
          `INSERT INTO billing_subscriptions (
             id, organization_id, provider_subscription_id, provider_customer_id,
             provider_order_id, product_id, variant_id, plan, status, renews_at,
             ends_at, provider_updated_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8::"Plan",
             $9::"BillingSubscriptionStatus", $10, $11, $12, NOW()
           )
           ON CONFLICT (organization_id) DO UPDATE SET
             provider_subscription_id = EXCLUDED.provider_subscription_id,
             provider_customer_id = EXCLUDED.provider_customer_id,
             provider_order_id = EXCLUDED.provider_order_id,
             product_id = EXCLUDED.product_id, variant_id = EXCLUDED.variant_id,
             plan = EXCLUDED.plan, status = EXCLUDED.status,
             renews_at = EXCLUDED.renews_at, ends_at = EXCLUDED.ends_at,
             provider_updated_at = EXCLUDED.provider_updated_at, updated_at = NOW()`,
          [
            randomUUID(),
            organizationId,
            resourceId,
            String(attributes.customer_id ?? '') || null,
            String(attributes.order_id ?? '') || null,
            String(attributes.product_id ?? '') || null,
            variantId,
            plan,
            status,
            renewsAt,
            endsAt,
            providerUpdatedAt,
          ],
        );
        await tx.query(
          'UPDATE organizations SET plan = $2::"Plan", updated_at = NOW() WHERE id = $1',
          [organizationId, effectivePlan],
        );
        if (checkout) {
          await tx.query(
            `UPDATE billing_checkout_sessions
             SET consumed_at = NOW()
             WHERE id = $1 AND consumed_at IS NULL`,
            [checkout.id],
          );
        }
        await tx.query(
          `UPDATE billing_webhook_events
           SET status = 'PROCESSED'::"BillingEventStatus", processed_at = NOW()
           WHERE id = $1`,
          [payloadHash],
        );
      }, { isolationLevel: 'SERIALIZABLE' });
    } catch (error) {
      if (isUniqueViolation(error)) return { status: 'duplicate' };
      throw error;
    }
    return { status: 'processed' };
  }

  private validCheckout(
    custom: CheckoutCustomData | undefined,
    plan: Plan,
    variantId: string,
  ) {
    if (!custom?.organization_id || !custom.checkout_session_id || !custom.nonce) {
      return Promise.resolve(null);
    }
    return db.maybeOne<CheckoutRow>(
      `SELECT id, organization_id FROM billing_checkout_sessions
       WHERE id = $1 AND organization_id = $2 AND plan = $3::"Plan"
         AND variant_id = $4 AND nonce_hash = $5
         AND consumed_at IS NULL AND expires_at > NOW()`,
      [
        custom.checkout_session_id,
        custom.organization_id,
        plan,
        variantId,
        sha256(custom.nonce),
      ],
    );
  }

  private mapStatus(value?: string): BillingSubscriptionStatus {
    const statuses: Record<string, BillingSubscriptionStatus> = {
      on_trial: 'ON_TRIAL',
      active: 'ACTIVE',
      paused: 'PAUSED',
      past_due: 'PAST_DUE',
      unpaid: 'UNPAID',
      cancelled: 'CANCELLED',
      expired: 'EXPIRED',
    };
    return statuses[value?.toLowerCase() ?? ''] ?? 'INACTIVE';
  }

  private entitledPlan(
    paidPlan: Plan,
    status: BillingSubscriptionStatus,
    endsAt: Date | null,
    providerUpdatedAt: Date,
  ): Plan {
    if (status === 'ACTIVE' || status === 'ON_TRIAL') return paidPlan;
    if (status === 'CANCELLED' && endsAt && endsAt > new Date()) return paidPlan;
    if (status === 'PAST_DUE') {
      const graceHours = Number(process.env.BILLING_PAST_DUE_GRACE_HOURS ?? 72);
      if (providerUpdatedAt.getTime() + graceHours * 3_600_000 > Date.now()) {
        return paidPlan;
      }
    }
    return 'FREE';
  }

  private variantForPlan(plan: Plan): string {
    const variants =
      plan === 'PRO'
        ? process.env.LEMON_SQUEEZY_PRO_VARIANT_IDS
        : process.env.LEMON_SQUEEZY_ENTERPRISE_VARIANT_IDS;
    const variant = variants?.split(',').map((value) => value.trim()).find(Boolean);
    if (!variant) throw new ConflictException(`No Lemon Squeezy variant configured for ${plan}`);
    return variant;
  }

  private planForVariant(variantId: string): Plan | null {
    const includes = (value?: string) =>
      value?.split(',').map((item) => item.trim()).includes(variantId) ?? false;
    if (includes(process.env.LEMON_SQUEEZY_PRO_VARIANT_IDS)) return 'PRO';
    if (includes(process.env.LEMON_SQUEEZY_ENTERPRISE_VARIANT_IDS)) return 'ENTERPRISE';
    return null;
  }

  private async assertBillingManager(tenant: TenantScope): Promise<void> {
    const membership = await db.maybeOne<{ role: string }>(
      `SELECT role FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [tenant.organizationId, tenant.userId],
    );
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Only organization owners can manage billing');
    }
  }
}
