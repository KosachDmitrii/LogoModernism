import type { AccessRole, Plan } from './entitlements';
import type { UsageSummary } from './usage';

export const LOGO_ADDON_PACKS = ['LOGOS_10', 'LOGOS_25'] as const;
export type LogoAddonPack = (typeof LOGO_ADDON_PACKS)[number];

export const LOGO_ADDON_PACK_DETAILS: Record<
  LogoAddonPack,
  { generations: number; priceUsd: number }
> = {
  LOGOS_10: { generations: 10, priceUsd: 4.99 },
  LOGOS_25: { generations: 25, priceUsd: 9.99 },
};

export const BILLING_SUBSCRIPTION_STATUSES = [
  'INACTIVE',
  'ON_TRIAL',
  'ACTIVE',
  'PAUSED',
  'PAST_DUE',
  'UNPAID',
  'CANCELLED',
  'EXPIRED',
] as const;

export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export type BillingOverview = {
  plan: Plan;
  accessRole: AccessRole;
  subscriptionStatus: BillingSubscriptionStatus;
  renewsAt?: string;
  endsAt?: string;
  usage: UsageSummary;
  canManageBilling: boolean;
};

export type BillingRedirect = {
  url: string;
};
