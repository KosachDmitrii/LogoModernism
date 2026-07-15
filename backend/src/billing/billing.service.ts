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
  LogoAddonPack,
  Plan,
} from '@logo-platform/shared';
import { LOGO_ADDON_PACK_DETAILS } from '@logo-platform/shared';
import type { TenantScope } from '../auth/tenant-context';
import { UsageService } from '../usage/usage.service';
import { LemonSqueezyClient } from './lemon-squeezy.client';

type LemonWebhook = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      organization_id?: string;
      checkout_session_id?: string;
      nonce?: string;
      checkout_kind?: string;
      pack?: string;
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
      refunded?: boolean;
      refunded_at?: string | null;
      first_order_item?: {
        product_id?: number | string;
        variant_id?: number | string;
      };
    };
  };
};
type CheckoutCustomData = NonNullable<
  NonNullable<LemonWebhook['meta']>['custom_data']
>;
type LemonAttributes = NonNullable<NonNullable<LemonWebhook['data']>['attributes']>;
type SubscriptionRow = {
  userId: string;
  organizationId: string;
  providerCustomerId: string | null;
  status: BillingSubscriptionStatus;
  renewsAt: Date | null;
  endsAt: Date | null;
  providerUpdatedAt: Date | null;
};
type CheckoutRow = {
  id: string;
  userId: string;
  organizationId: string;
};
type AddonCheckoutRow = CheckoutRow & {
  pack: LogoAddonPack;
  generationQuantity: number;
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
    const [account, subscription, usage] = await Promise.all([
      db.maybeOne<{ plan: Plan; accessRole: 'ADMIN' | 'USER' }>(
        'SELECT plan, access_role FROM users WHERE id = $1',
        [tenant.userId],
      ),
      db.maybeOne<SubscriptionRow>(
        'SELECT * FROM billing_subscriptions WHERE user_id = $1',
        [tenant.userId],
      ),
      this.usage.summary(tenant),
    ]);
    if (!account) throw new NotFoundException('User account not found');
    return {
      plan: account.plan,
      accessRole: account.accessRole,
      subscriptionStatus: subscription?.status ?? 'INACTIVE',
      renewsAt: subscription?.renewsAt?.toISOString(),
      endsAt: subscription?.endsAt?.toISOString(),
      usage,
      canManageBilling: account.accessRole !== 'ADMIN',
    };
  }

  async createCheckout(tenant: TenantScope, requestedPlan: Plan) {
    if (tenant.accessRole === 'ADMIN') {
      throw new BadRequestException('Administrator accounts do not require a subscription');
    }
    if (requestedPlan !== 'PLUS' && requestedPlan !== 'PRO') {
      throw new BadRequestException('Only PLUS and PRO plans are available');
    }
    const existing = await db.maybeOne<SubscriptionRow>(
      `SELECT * FROM billing_subscriptions
       WHERE user_id = $1
         AND status IN (
           'ACTIVE'::"BillingSubscriptionStatus",
           'ON_TRIAL'::"BillingSubscriptionStatus",
           'CANCELLED'::"BillingSubscriptionStatus"
         )`,
      [tenant.userId],
    );
    if (existing?.providerCustomerId) {
      return {
        url: await this.lemon.getCustomerPortalUrl(existing.providerCustomerId),
      };
    }
    const variantId = this.variantForPlan(requestedPlan);
    const nonce = randomBytes(24).toString('base64url');
    const session = await db.one<{ id: string }>(
        `INSERT INTO billing_checkout_sessions (
         id, organization_id, user_id, requested_by, plan, variant_id, nonce_hash, expires_at
       ) VALUES ($1, $2, $3, $3, $4::"Plan", $5, $6, $7)
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
        userId: tenant.userId,
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

  async createAddonCheckout(tenant: TenantScope, pack: LogoAddonPack) {
    if (tenant.accessRole === 'ADMIN') {
      throw new BadRequestException('Administrator accounts have unlimited logo generations');
    }
    const details = LOGO_ADDON_PACK_DETAILS[pack];
    if (!details) throw new BadRequestException('Unknown logo generation pack');
    const variantId = this.variantForAddon(pack);
    const nonce = randomBytes(24).toString('base64url');
    const session = await db.one<{ id: string }>(
      `INSERT INTO billing_addon_checkout_sessions (
         id, organization_id, user_id, requested_by, pack, variant_id,
         generation_quantity, nonce_hash, expires_at
       ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        randomUUID(),
        tenant.organizationId,
        tenant.userId,
        pack,
        variantId,
        details.generations,
        sha256(nonce),
        new Date(Date.now() + 30 * 60_000),
      ],
    );
    try {
      const url = await this.lemon.createCheckout({
        variantId,
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        checkoutSessionId: session.id,
        nonce,
        checkoutKind: 'logo_addon',
        pack,
      });
      return { url };
    } catch (error) {
      await db.query('DELETE FROM billing_addon_checkout_sessions WHERE id = $1', [session.id])
        .catch(() => undefined);
      throw error;
    }
  }

  async customerPortal(tenant: TenantScope) {
    const subscription = await db.maybeOne<SubscriptionRow>(
      'SELECT * FROM billing_subscriptions WHERE user_id = $1',
      [tenant.userId],
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

    if (eventName === 'order_created' && resourceId && attributes) {
      const orderVariantId = String(attributes.first_order_item?.variant_id ?? '');
      const addonPack = this.addonForVariant(orderVariantId);
      if (addonPack) {
        return this.processAddonOrder({
          payloadHash,
          resourceId,
          attributes,
          custom: payload.meta?.custom_data,
          pack: addonPack,
          variantId: orderVariantId,
        });
      }
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
    const userId = existingSubscription?.userId ?? checkout?.userId;
    if (!organizationId || !userId) {
      throw new ForbiddenException('Webhook is not linked to a checkout');
    }
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
             id, organization_id, user_id, provider_subscription_id, provider_customer_id,
             provider_order_id, product_id, variant_id, plan, status, renews_at,
             ends_at, provider_updated_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9::"Plan",
             $10::"BillingSubscriptionStatus", $11, $12, $13, NOW()
           )
           ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
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
            userId,
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
          'UPDATE users SET plan = $2::"Plan", updated_at = NOW() WHERE id = $1',
          [userId, effectivePlan],
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

  private async processAddonOrder(input: {
    payloadHash: string;
    resourceId: string;
    attributes: LemonAttributes;
    custom?: CheckoutCustomData;
    pack: LogoAddonPack;
    variantId: string;
  }): Promise<{ status: 'processed' | 'duplicate' }> {
    const { payloadHash, resourceId, attributes, custom, pack, variantId } = input;
    if (attributes.status?.toLowerCase() !== 'paid' || attributes.refunded) {
      throw new ForbiddenException('Logo add-on order is not paid');
    }
    if (
      custom?.checkout_kind !== 'logo_addon' ||
      custom.pack !== pack ||
      !custom.checkout_session_id ||
      !custom.nonce ||
      !custom.user_id
    ) {
      throw new ForbiddenException('Logo add-on order is not linked to a valid checkout');
    }
    const details = LOGO_ADDON_PACK_DETAILS[pack];
    try {
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO billing_webhook_events (id, event_name, resource_id, status)
           VALUES ($1, 'order_created', $2, 'RECEIVED'::"BillingEventStatus")`,
          [payloadHash, resourceId],
        );
        await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `usage:${custom.user_id}`,
        ]);
        const checkout = await tx.maybeOne<AddonCheckoutRow>(
          `SELECT id, user_id, organization_id, pack, generation_quantity
           FROM billing_addon_checkout_sessions
           WHERE id = $1
             AND user_id = $2
             AND ($3::text IS NULL OR organization_id = $3)
             AND pack = $4
             AND variant_id = $5
             AND nonce_hash = $6
             AND generation_quantity = $7
             AND consumed_at IS NULL
             AND expires_at > NOW()
           FOR UPDATE`,
          [
            custom.checkout_session_id,
            custom.user_id,
            custom.organization_id ?? null,
            pack,
            variantId,
            sha256(custom.nonce!),
            details.generations,
          ],
        );
        if (!checkout) throw new ForbiddenException('Logo add-on checkout is invalid or expired');

        await tx.query(
          `INSERT INTO billing_addon_fulfillments (
             provider_order_id, checkout_session_id, organization_id, user_id,
             provider_customer_id, product_id, variant_id, pack, generation_quantity
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            resourceId,
            checkout.id,
            checkout.organizationId,
            checkout.userId,
            String(attributes.customer_id ?? '') || null,
            String(attributes.first_order_item?.product_id ?? attributes.product_id ?? '') || null,
            variantId,
            pack,
            details.generations,
          ],
        );
        await tx.query(
          `INSERT INTO logo_bonus_transactions (
             id, user_id, kind, credits, provider, provider_order_id, metadata
           ) VALUES ($1, $2, 'PURCHASE', $3, 'LEMON_SQUEEZY', $4, $5::jsonb)`,
          [
            randomUUID(),
            checkout.userId,
            details.generations,
            resourceId,
            JSON.stringify({ pack, variantId, checkoutSessionId: checkout.id }),
          ],
        );
        await tx.query(
          `INSERT INTO logo_bonus_balances (user_id, available_credits, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             available_credits =
               logo_bonus_balances.available_credits + EXCLUDED.available_credits,
             updated_at = NOW()`,
          [checkout.userId, details.generations],
        );
        await tx.query(
          `UPDATE billing_addon_checkout_sessions
           SET consumed_at = NOW() WHERE id = $1`,
          [checkout.id],
        );
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
    if (!custom?.checkout_session_id || !custom.nonce) {
      return Promise.resolve(null);
    }
    return db.maybeOne<CheckoutRow>(
      `SELECT id, user_id, organization_id FROM billing_checkout_sessions
       WHERE id = $1
         AND ($2::text IS NULL OR user_id = $2)
         AND ($3::text IS NULL OR organization_id = $3)
         AND plan = $4::"Plan"
         AND variant_id = $5 AND nonce_hash = $6
         AND consumed_at IS NULL AND expires_at > NOW()`,
      [
        custom.checkout_session_id,
        custom.user_id ?? null,
        custom.organization_id ?? null,
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
      plan === 'PLUS'
        ? process.env.LEMON_SQUEEZY_PLUS_VARIANT_IDS
        : process.env.LEMON_SQUEEZY_PRO_VARIANT_IDS;
    const variant = variants?.split(',').map((value) => value.trim()).find(Boolean);
    if (!variant) throw new ConflictException(`No Lemon Squeezy variant configured for ${plan}`);
    return variant;
  }

  private planForVariant(variantId: string): Plan | null {
    const includes = (value?: string) =>
      value?.split(',').map((item) => item.trim()).includes(variantId) ?? false;
    const matches: Plan[] = [];
    if (includes(process.env.LEMON_SQUEEZY_PLUS_VARIANT_IDS)) matches.push('PLUS');
    if (includes(process.env.LEMON_SQUEEZY_PRO_VARIANT_IDS)) matches.push('PRO');
    if (this.addonForVariantUnchecked(variantId)) {
      throw new ConflictException(`Lemon Squeezy variant ${variantId} is mapped more than once`);
    }
    if (matches.length > 1) {
      throw new ConflictException(`Lemon Squeezy variant ${variantId} is mapped more than once`);
    }
    return matches[0] ?? null;
  }

  private variantForAddon(pack: LogoAddonPack): string {
    const variants =
      pack === 'LOGOS_10'
        ? process.env.LEMON_SQUEEZY_LOGOS_10_VARIANT_IDS
        : process.env.LEMON_SQUEEZY_LOGOS_25_VARIANT_IDS;
    const variant = variants?.split(',').map((value) => value.trim()).find(Boolean);
    if (!variant) throw new ConflictException(`No Lemon Squeezy variant configured for ${pack}`);
    return variant;
  }

  private addonForVariant(variantId: string): LogoAddonPack | null {
    const pack = this.addonForVariantUnchecked(variantId);
    if (!pack) return null;
    const inPlanVariants = [process.env.LEMON_SQUEEZY_PLUS_VARIANT_IDS, process.env.LEMON_SQUEEZY_PRO_VARIANT_IDS]
      .some((value) => value?.split(',').map((item) => item.trim()).includes(variantId));
    if (inPlanVariants) {
      throw new ConflictException(`Lemon Squeezy variant ${variantId} is mapped more than once`);
    }
    return pack;
  }

  private addonForVariantUnchecked(variantId: string): LogoAddonPack | null {
    const includes = (value?: string) =>
      value?.split(',').map((item) => item.trim()).includes(variantId) ?? false;
    const matches: LogoAddonPack[] = [];
    if (includes(process.env.LEMON_SQUEEZY_LOGOS_10_VARIANT_IDS)) matches.push('LOGOS_10');
    if (includes(process.env.LEMON_SQUEEZY_LOGOS_25_VARIANT_IDS)) matches.push('LOGOS_25');
    if (matches.length > 1) {
      throw new ConflictException(`Lemon Squeezy variant ${variantId} is mapped more than once`);
    }
    return matches[0] ?? null;
  }
}
