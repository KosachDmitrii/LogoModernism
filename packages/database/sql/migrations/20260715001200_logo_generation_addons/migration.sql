CREATE TABLE public.logo_bonus_balances (
  user_id TEXT PRIMARY KEY,
  available_credits INTEGER NOT NULL DEFAULT 0,
  reserved_credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT logo_bonus_balances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT logo_bonus_balances_nonnegative_check
    CHECK (available_credits >= 0 AND reserved_credits >= 0)
);

CREATE TABLE public.logo_bonus_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  credits INTEGER NOT NULL,
  provider TEXT,
  provider_order_id TEXT,
  usage_operation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT logo_bonus_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT logo_bonus_transactions_usage_operation_id_fkey
    FOREIGN KEY (usage_operation_id) REFERENCES public.usage_operations(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT logo_bonus_transactions_kind_check
    CHECK (kind IN ('PURCHASE', 'CONSUMPTION', 'REFUND', 'ADJUSTMENT')),
  CONSTRAINT logo_bonus_transactions_credits_check CHECK (credits <> 0)
);

CREATE UNIQUE INDEX logo_bonus_transactions_provider_order_kind_key
  ON public.logo_bonus_transactions(provider, provider_order_id, kind)
  WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX logo_bonus_transactions_usage_operation_kind_key
  ON public.logo_bonus_transactions(usage_operation_id, kind)
  WHERE usage_operation_id IS NOT NULL;
CREATE INDEX logo_bonus_transactions_user_created_idx
  ON public.logo_bonus_transactions(user_id, created_at DESC);

CREATE TABLE public.billing_addon_checkout_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  pack TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  generation_quantity INTEGER NOT NULL,
  nonce_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP(3) NOT NULL,
  consumed_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT billing_addon_checkout_sessions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT billing_addon_checkout_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT billing_addon_checkout_sessions_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES public.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT billing_addon_checkout_sessions_pack_check
    CHECK (pack IN ('LOGOS_10', 'LOGOS_25')),
  CONSTRAINT billing_addon_checkout_sessions_quantity_check
    CHECK (generation_quantity IN (10, 25)),
  CONSTRAINT billing_addon_checkout_sessions_period_check
    CHECK (expires_at > created_at)
);

CREATE INDEX billing_addon_checkout_sessions_user_expires_idx
  ON public.billing_addon_checkout_sessions(user_id, expires_at DESC);

CREATE TABLE public.billing_addon_fulfillments (
  provider_order_id TEXT PRIMARY KEY,
  checkout_session_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider_customer_id TEXT,
  product_id TEXT,
  variant_id TEXT NOT NULL,
  pack TEXT NOT NULL,
  generation_quantity INTEGER NOT NULL,
  fulfilled_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  refunded_at TIMESTAMP(3),
  CONSTRAINT billing_addon_fulfillments_checkout_session_id_fkey
    FOREIGN KEY (checkout_session_id) REFERENCES public.billing_addon_checkout_sessions(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT billing_addon_fulfillments_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT billing_addon_fulfillments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT billing_addon_fulfillments_pack_check
    CHECK (pack IN ('LOGOS_10', 'LOGOS_25')),
  CONSTRAINT billing_addon_fulfillments_quantity_check
    CHECK (generation_quantity IN (10, 25))
);

ALTER TABLE public.usage_operations
  ADD COLUMN included_actual_credits INTEGER,
  ADD COLUMN purchased_actual_credits INTEGER;

UPDATE public.usage_operations
SET included_actual_credits = actual_credits,
    purchased_actual_credits = 0
WHERE actual_credits IS NOT NULL;

ALTER TABLE public.usage_operations
  ADD CONSTRAINT usage_operations_actual_split_check
  CHECK (
    (actual_credits IS NULL
      AND included_actual_credits IS NULL
      AND purchased_actual_credits IS NULL)
    OR
    (actual_credits IS NOT NULL
      AND included_actual_credits >= 0
      AND purchased_actual_credits >= 0
      AND included_actual_credits + purchased_actual_credits = actual_credits
      AND included_actual_credits <= included_reserved_credits
      AND purchased_actual_credits <= purchased_reserved_credits)
  );

ALTER TABLE public.logo_bonus_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logo_bonus_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addon_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addon_fulfillments ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.logo_bonus_balances,
  public.logo_bonus_transactions,
  public.billing_addon_checkout_sessions,
  public.billing_addon_fulfillments
FROM PUBLIC, anon, authenticated, service_role;
