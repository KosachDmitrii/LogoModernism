import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, prisma } from '@logo-platform/database';
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
    type?: string;
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

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly lemon: LemonSqueezyClient,
    private readonly usage: UsageService,
  ) {}

  async overview(tenant: TenantScope): Promise<BillingOverview> {
    const [organization, membership, subscription, usage] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: tenant.organizationId },
        select: { plan: true },
      }),
      prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: tenant.organizationId,
            userId: tenant.userId,
          },
        },
        select: { role: true },
      }),
      prisma.billingSubscription.findUnique({
        where: { organizationId: tenant.organizationId },
      }),
      this.usage.summary(tenant.organizationId),
    ]);
    if (!organization || !membership) throw new NotFoundException('Organization not found');

    return {
      plan: organization.plan as Plan,
      subscriptionStatus:
        (subscription?.status as BillingSubscriptionStatus | undefined) ?? 'INACTIVE',
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
    const session = await prisma.billingCheckoutSession.create({
      data: {
        organizationId: tenant.organizationId,
        requestedBy: tenant.userId,
        plan: requestedPlan,
        variantId,
        nonceHash: sha256(nonce),
        expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
      },
    });

    try {
      const url = await this.lemon.createCheckout({
        variantId,
        organizationId: tenant.organizationId,
        checkoutSessionId: session.id,
        nonce,
      });
      return { url };
    } catch (error) {
      await prisma.billingCheckoutSession.delete({ where: { id: session.id } }).catch(() => undefined);
      throw error;
    }
  }

  async customerPortal(tenant: TenantScope) {
    await this.assertBillingManager(tenant);
    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!subscription?.providerCustomerId) {
      throw new NotFoundException('No billing customer exists for this organization');
    }
    return {
      url: await this.lemon.getCustomerPortalUrl(subscription.providerCustomerId),
    };
  }

  async processWebhook(
    rawBody: Buffer,
    eventHeader: string | undefined,
  ): Promise<{ status: 'processed' | 'ignored' | 'duplicate' }> {
    const payloadHash = sha256(rawBody);
    const existingEvent = await prisma.billingWebhookEvent.findUnique({
      where: { id: payloadHash },
    });
    if (existingEvent) return { status: 'duplicate' };

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
      await prisma.billingWebhookEvent.create({
        data: {
          id: payloadHash,
          eventName,
          resourceId,
          status: 'IGNORED',
          processedAt: new Date(),
        },
      });
      return { status: 'ignored' };
    }

    const variantId = String(attributes.variant_id ?? '');
    const plan = this.planForVariant(variantId);
    if (!plan) throw new ForbiddenException('Unknown billing variant');
    const status = this.mapStatus(attributes.status);
    const providerUpdatedAt = asDate(attributes.updated_at) ?? new Date();
    const renewsAt = asDate(attributes.renews_at);
    const endsAt = asDate(attributes.ends_at);
    const existingSubscription = await prisma.billingSubscription.findUnique({
      where: { providerSubscriptionId: resourceId },
    });
    const checkout = existingSubscription
      ? null
      : await this.validCheckout(payload.meta?.custom_data, plan, variantId);
    const organizationId =
      existingSubscription?.organizationId ?? checkout?.organizationId;
    if (!organizationId) throw new ForbiddenException('Webhook is not linked to a checkout');
    const effectivePlan = this.entitledPlan(
      plan,
      status,
      endsAt,
      providerUpdatedAt,
    );

    try {
      await prisma.$transaction(async (tx) => {
        await tx.billingWebhookEvent.create({
          data: {
            id: payloadHash,
            eventName,
            resourceId,
            status: 'RECEIVED',
          },
        });
        const current = await tx.billingSubscription.findUnique({
          where: { organizationId },
        });
        if (
          current?.providerUpdatedAt &&
          current.providerUpdatedAt.getTime() > providerUpdatedAt.getTime()
        ) {
          await tx.billingWebhookEvent.update({
            where: { id: payloadHash },
            data: { status: 'IGNORED', processedAt: new Date() },
          });
          return;
        }

        await tx.billingSubscription.upsert({
          where: { organizationId },
          create: {
            organizationId,
            providerSubscriptionId: resourceId,
            providerCustomerId: String(attributes.customer_id ?? '') || null,
            providerOrderId: String(attributes.order_id ?? '') || null,
            productId: String(attributes.product_id ?? '') || null,
            variantId,
            plan,
            status,
            renewsAt,
            endsAt,
            providerUpdatedAt,
          },
          update: {
            providerSubscriptionId: resourceId,
            providerCustomerId: String(attributes.customer_id ?? '') || null,
            providerOrderId: String(attributes.order_id ?? '') || null,
            productId: String(attributes.product_id ?? '') || null,
            variantId,
            plan,
            status,
            renewsAt,
            endsAt,
            providerUpdatedAt,
          },
        });
        await tx.organization.update({
          where: { id: organizationId },
          data: { plan: effectivePlan },
        });
        if (checkout) {
          await tx.billingCheckoutSession.update({
            where: { id: checkout.id },
            data: { consumedAt: new Date() },
          });
        }
        await tx.billingWebhookEvent.update({
          where: { id: payloadHash },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'duplicate' };
      }
      throw error;
    }
    return { status: 'processed' };
  }

  private async validCheckout(
    custom: CheckoutCustomData | undefined,
    plan: Plan,
    variantId: string,
  ) {
    if (
      !custom?.organization_id ||
      !custom.checkout_session_id ||
      !custom.nonce
    ) {
      return null;
    }
    const checkout = await prisma.billingCheckoutSession.findFirst({
      where: {
        id: custom.checkout_session_id,
        organizationId: custom.organization_id,
        plan,
        variantId,
        nonceHash: sha256(custom.nonce),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return checkout;
  }

  private mapStatus(value?: string): BillingSubscriptionStatus {
    const normalized = value?.toLowerCase();
    const statuses: Record<string, BillingSubscriptionStatus> = {
      on_trial: 'ON_TRIAL',
      active: 'ACTIVE',
      paused: 'PAUSED',
      past_due: 'PAST_DUE',
      unpaid: 'UNPAID',
      cancelled: 'CANCELLED',
      expired: 'EXPIRED',
    };
    return statuses[normalized ?? ''] ?? 'INACTIVE';
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
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenant.organizationId,
          userId: tenant.userId,
        },
      },
      select: { role: true },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Only organization owners can manage billing');
    }
  }
}
