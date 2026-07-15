import type { Plan } from './entitlements';
import type { UsageSummary } from './usage';

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
  subscriptionStatus: BillingSubscriptionStatus;
  renewsAt?: string;
  endsAt?: string;
  usage: UsageSummary;
  canManageBilling: boolean;
};

export type BillingRedirect = {
  url: string;
};
