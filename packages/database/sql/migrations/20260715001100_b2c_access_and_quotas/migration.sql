CREATE TYPE "AccessRole" AS ENUM ('ADMIN', 'USER');

ALTER TABLE public.users
  ADD COLUMN access_role "AccessRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN plan "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN organization_name TEXT;

UPDATE public.users
SET access_role = CASE
  WHEN platform_role = 'PLATFORM_ADMIN'::"PlatformRole" THEN 'ADMIN'::"AccessRole"
  ELSE 'USER'::"AccessRole"
END;

WITH owner_accounts AS (
  SELECT om.user_id, om.organization_id, o.name, o.plan,
         COUNT(*) OVER (PARTITION BY om.user_id) AS organization_count
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.role = 'OWNER'::"Role"
)
UPDATE public.users u
SET organization_name = owners.name,
    plan = CASE
      WHEN owners.plan = 'ENTERPRISE'::"Plan" THEN 'PRO'::"Plan"
      ELSE owners.plan
    END
FROM owner_accounts owners
WHERE owners.user_id = u.id
  AND owners.organization_count = 1;

ALTER TABLE public.brands ADD COLUMN user_id TEXT;
ALTER TABLE public.prompt_generation_runs ADD COLUMN user_id TEXT;
ALTER TABLE public.generated_prompts ADD COLUMN user_id TEXT;
ALTER TABLE public.generated_logos ADD COLUMN user_id TEXT;
ALTER TABLE public.generated_logo_versions ADD COLUMN user_id TEXT;
ALTER TABLE public.billing_subscriptions ADD COLUMN user_id TEXT;
ALTER TABLE public.billing_checkout_sessions ADD COLUMN user_id TEXT;
ALTER TABLE public.usage_buckets
  ADD COLUMN user_id TEXT,
  ADD COLUMN quota_key TEXT NOT NULL DEFAULT 'legacy.credits',
  ADD COLUMN quota_limit INTEGER,
  ADD COLUMN quota_exempt BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TEMP TABLE b2c_organization_owners ON COMMIT DROP AS
  SELECT organization_id, MIN(user_id) AS user_id
  FROM public.organization_members
  WHERE role = 'OWNER'::"Role"
  GROUP BY organization_id
  HAVING COUNT(*) = 1;

UPDATE public.projects p
SET user_id = owners.user_id
FROM b2c_organization_owners owners
WHERE p.user_id IS NULL AND owners.organization_id = p.organization_id;

UPDATE public.brands b
SET user_id = COALESCE(
  (SELECT p.user_id FROM public.projects p WHERE p.id = b.project_id),
  owners.user_id
)
FROM b2c_organization_owners owners
WHERE owners.organization_id = b.organization_id;

UPDATE public.prompt_generation_runs runs
SET user_id = p.user_id
FROM public.projects p
WHERE p.id = runs.project_id AND p.user_id IS NOT NULL;

UPDATE public.generated_prompts prompts
SET user_id = COALESCE(
  (SELECT runs.user_id
   FROM public.prompt_generation_runs runs
   WHERE runs.id = prompts.prompt_run_id),
  owners.user_id
)
FROM b2c_organization_owners owners
WHERE owners.organization_id = prompts.organization_id;

UPDATE public.generated_logos logos
SET user_id = COALESCE(
  (SELECT prompts.user_id
   FROM public.generated_prompts prompts
   WHERE prompts.id = logos.prompt_id),
  (SELECT p.user_id FROM public.projects p WHERE p.id = logos.project_id),
  owners.user_id
)
FROM b2c_organization_owners owners
WHERE owners.organization_id = logos.organization_id;

UPDATE public.generated_logo_versions versions
SET user_id = logos.user_id
FROM public.generated_logos logos
WHERE logos.id = versions.logo_id;

UPDATE public.billing_subscriptions subscriptions
SET user_id = owners.user_id
FROM b2c_organization_owners owners
WHERE owners.organization_id = subscriptions.organization_id;

UPDATE public.billing_checkout_sessions sessions
SET user_id = sessions.requested_by;

UPDATE public.usage_buckets buckets
SET user_id = owners.user_id
FROM b2c_organization_owners owners
WHERE owners.organization_id = buckets.organization_id;

ALTER TABLE public.brands
  ADD CONSTRAINT brands_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.prompt_generation_runs
  ADD CONSTRAINT prompt_generation_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_prompts
  ADD CONSTRAINT generated_prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_logos
  ADD CONSTRAINT generated_logos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_logo_versions
  ADD CONSTRAINT generated_logo_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.billing_subscriptions
  ADD CONSTRAINT billing_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.billing_checkout_sessions
  ADD CONSTRAINT billing_checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.usage_buckets
  ADD CONSTRAINT usage_buckets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS public.billing_subscriptions_organization_id_key;
CREATE UNIQUE INDEX billing_subscriptions_user_id_key
  ON public.billing_subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX billing_checkout_sessions_user_expires_idx
  ON public.billing_checkout_sessions(user_id, expires_at);

DROP INDEX IF EXISTS public.usage_buckets_organization_period_key;
CREATE UNIQUE INDEX usage_buckets_user_period_quota_key
  ON public.usage_buckets(user_id, period_start, quota_key, quota_exempt)
  WHERE user_id IS NOT NULL;
CREATE INDEX usage_operations_user_key_created_idx
  ON public.usage_operations(user_id, operation_key, created_at DESC);

CREATE INDEX brands_user_id_created_at_idx ON public.brands(user_id, created_at DESC);
CREATE INDEX prompt_generation_runs_user_id_created_at_idx
  ON public.prompt_generation_runs(user_id, created_at DESC);
CREATE INDEX generated_prompts_user_id_created_at_idx
  ON public.generated_prompts(user_id, created_at DESC);
CREATE INDEX generated_logos_user_id_created_at_idx
  ON public.generated_logos(user_id, created_at DESC);
