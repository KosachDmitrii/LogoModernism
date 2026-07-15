CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN');
CREATE TYPE "BillingProvider" AS ENUM ('LEMON_SQUEEZY');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM (
  'INACTIVE',
  'ON_TRIAL',
  'ACTIVE',
  'PAUSED',
  'PAST_DUE',
  'UNPAID',
  'CANCELLED',
  'EXPIRED'
);
CREATE TYPE "BillingEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');
CREATE TYPE "UsageReservationStatus" AS ENUM (
  'RESERVED',
  'PROCESSING',
  'COMMITTED',
  'RELEASED',
  'EXPIRED'
);

ALTER TABLE public.users
  ADD COLUMN platform_role "PlatformRole" NOT NULL DEFAULT 'USER';

CREATE TABLE public.billing_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  provider "BillingProvider" NOT NULL DEFAULT 'LEMON_SQUEEZY',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  provider_order_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  plan "Plan" NOT NULL DEFAULT 'FREE',
  status "BillingSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
  renews_at TIMESTAMP(3),
  ends_at TIMESTAMP(3),
  provider_updated_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT billing_subscriptions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX billing_subscriptions_organization_id_key
  ON public.billing_subscriptions(organization_id);
CREATE UNIQUE INDEX billing_subscriptions_provider_subscription_id_key
  ON public.billing_subscriptions(provider_subscription_id);
CREATE INDEX billing_subscriptions_status_updated_idx
  ON public.billing_subscriptions(status, provider_updated_at);

CREATE TABLE public.billing_checkout_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  plan "Plan" NOT NULL,
  variant_id TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  consumed_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT billing_checkout_sessions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT billing_checkout_sessions_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES public.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX billing_checkout_sessions_nonce_hash_key
  ON public.billing_checkout_sessions(nonce_hash);
CREATE INDEX billing_checkout_sessions_org_expires_idx
  ON public.billing_checkout_sessions(organization_id, expires_at);

CREATE TABLE public.billing_webhook_events (
  id TEXT PRIMARY KEY,
  provider "BillingProvider" NOT NULL DEFAULT 'LEMON_SQUEEZY',
  event_name TEXT NOT NULL,
  resource_id TEXT,
  status "BillingEventStatus" NOT NULL DEFAULT 'RECEIVED',
  error TEXT,
  received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP(3)
);

CREATE INDEX billing_webhook_events_status_received_idx
  ON public.billing_webhook_events(status, received_at);

CREATE TABLE public.usage_buckets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  period_start TIMESTAMP(3) NOT NULL,
  period_end TIMESTAMP(3) NOT NULL,
  plan "Plan" NOT NULL,
  included_credits INTEGER NOT NULL,
  reserved_credits INTEGER NOT NULL DEFAULT 0,
  committed_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT usage_buckets_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT usage_buckets_nonnegative_check
    CHECK (
      included_credits >= 0
      AND reserved_credits >= 0
      AND committed_credits >= 0
    ),
  CONSTRAINT usage_buckets_period_check CHECK (period_end > period_start)
);

CREATE UNIQUE INDEX usage_buckets_organization_period_key
  ON public.usage_buckets(organization_id, period_start);
CREATE INDEX usage_buckets_period_end_idx
  ON public.usage_buckets(period_end);

CREATE TABLE public.credit_balances (
  organization_id TEXT PRIMARY KEY,
  available_credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT credit_balances_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT credit_balances_nonnegative_check CHECK (available_credits >= 0)
);

CREATE TABLE public.usage_operations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  project_id TEXT,
  bucket_id TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status "UsageReservationStatus" NOT NULL DEFAULT 'RESERVED',
  reserved_credits INTEGER NOT NULL,
  included_reserved_credits INTEGER NOT NULL DEFAULT 0,
  purchased_reserved_credits INTEGER NOT NULL DEFAULT 0,
  actual_credits INTEGER,
  job_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT usage_operations_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT usage_operations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT usage_operations_bucket_id_fkey
    FOREIGN KEY (bucket_id) REFERENCES public.usage_buckets(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT usage_operations_credits_check
    CHECK (
      reserved_credits > 0
      AND included_reserved_credits >= 0
      AND purchased_reserved_credits >= 0
      AND included_reserved_credits + purchased_reserved_credits = reserved_credits
      AND (actual_credits IS NULL OR actual_credits >= 0)
    )
);

CREATE UNIQUE INDEX usage_operations_org_idempotency_key
  ON public.usage_operations(organization_id, idempotency_key);
CREATE INDEX usage_operations_status_expires_idx
  ON public.usage_operations(status, expires_at);
CREATE INDEX usage_operations_org_key_created_idx
  ON public.usage_operations(organization_id, operation_key, created_at);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.billing_subscriptions,
  public.billing_checkout_sessions,
  public.billing_webhook_events,
  public.usage_buckets,
  public.usage_operations,
  public.credit_balances
FROM PUBLIC, anon, authenticated, service_role;
