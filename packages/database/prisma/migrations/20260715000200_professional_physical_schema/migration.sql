-- Zero-loss physical rename. Run during a controlled maintenance window.
SET lock_timeout = '10s';
SET statement_timeout = '10min';

BEGIN;

CREATE SCHEMA IF NOT EXISTS legacy;
ALTER TABLE "DesignPrinciple" SET SCHEMA legacy;

ALTER TABLE "User" RENAME TO users;
ALTER TABLE "Organization" RENAME TO organizations;
ALTER TABLE "OrganizationMember" RENAME TO organization_members;
ALTER TABLE "Project" RENAME TO projects;
ALTER TABLE "Brand" RENAME TO brands;
ALTER TABLE "BrandDNA" RENAME TO brand_profiles;
ALTER TABLE "PromptRun" RENAME TO prompt_generation_runs;
ALTER TABLE "ComposedPromptRecord" RENAME TO generated_prompts;
ALTER TABLE "Logo" RENAME TO generated_logos;
ALTER TABLE "LogoVersion" RENAME TO generated_logo_versions;
ALTER TABLE "BrainExperience" RENAME TO design_brain_experiences;
ALTER TABLE "BrainTasteSignal" RENAME TO design_brain_taste_signals;
ALTER TABLE "LearnedPrinciple" RENAME TO learned_design_principles;

ALTER TABLE users RENAME CONSTRAINT "User_pkey" TO users_pkey;
ALTER TABLE organizations RENAME CONSTRAINT "Organization_pkey" TO organizations_pkey;
ALTER TABLE organization_members RENAME CONSTRAINT "OrganizationMember_pkey" TO organization_members_pkey;
ALTER TABLE organization_members RENAME CONSTRAINT "OrganizationMember_organizationId_fkey" TO organization_members_organization_id_fkey;
ALTER TABLE organization_members RENAME CONSTRAINT "OrganizationMember_userId_fkey" TO organization_members_user_id_fkey;
ALTER TABLE projects RENAME CONSTRAINT "Project_pkey" TO projects_pkey;
ALTER TABLE projects RENAME CONSTRAINT "Project_organizationId_fkey" TO projects_organization_id_fkey;
ALTER TABLE projects RENAME CONSTRAINT "Project_userId_fkey" TO projects_user_id_fkey;
ALTER TABLE brands RENAME CONSTRAINT "Brand_pkey" TO brands_pkey;
ALTER TABLE brands RENAME CONSTRAINT "Brand_organizationId_fkey" TO brands_organization_id_fkey;
ALTER TABLE brands RENAME CONSTRAINT "Brand_projectId_fkey" TO brands_project_id_fkey;
ALTER TABLE brand_profiles RENAME CONSTRAINT "BrandDNA_pkey" TO brand_profiles_pkey;
ALTER TABLE brand_profiles RENAME CONSTRAINT "BrandDNA_brandId_fkey" TO brand_profiles_brand_id_fkey;
ALTER TABLE prompt_generation_runs RENAME CONSTRAINT "PromptRun_pkey" TO prompt_generation_runs_pkey;
ALTER TABLE prompt_generation_runs RENAME CONSTRAINT "PromptRun_projectId_fkey" TO prompt_generation_runs_project_id_fkey;
ALTER TABLE generated_prompts RENAME CONSTRAINT "ComposedPromptRecord_pkey" TO generated_prompts_pkey;
ALTER TABLE generated_prompts RENAME CONSTRAINT "ComposedPromptRecord_promptRunId_fkey" TO generated_prompts_prompt_run_id_fkey;
ALTER TABLE generated_logos RENAME CONSTRAINT "Logo_pkey" TO generated_logos_pkey;
ALTER TABLE generated_logos RENAME CONSTRAINT "Logo_brandId_fkey" TO generated_logos_brand_id_fkey;
ALTER TABLE generated_logos RENAME CONSTRAINT "Logo_projectId_fkey" TO generated_logos_project_id_fkey;
ALTER TABLE generated_logo_versions RENAME CONSTRAINT "LogoVersion_pkey" TO generated_logo_versions_pkey;
ALTER TABLE generated_logo_versions RENAME CONSTRAINT "LogoVersion_logoId_fkey" TO generated_logo_versions_logo_id_fkey;
ALTER TABLE design_brain_experiences RENAME CONSTRAINT "BrainExperience_pkey" TO design_brain_experiences_pkey;
ALTER TABLE design_brain_taste_signals RENAME CONSTRAINT "BrainTasteSignal_pkey" TO design_brain_taste_signals_pkey;
ALTER TABLE design_brain_taste_signals RENAME CONSTRAINT "BrainTasteSignal_experienceId_fkey" TO design_brain_taste_signals_experience_id_fkey;
ALTER TABLE learned_design_principles RENAME CONSTRAINT "LearnedPrinciple_pkey" TO learned_design_principles_pkey;

ALTER INDEX IF EXISTS "User_email_key" RENAME TO users_email_key;
ALTER INDEX IF EXISTS "Organization_slug_key" RENAME TO organizations_slug_key;
ALTER INDEX IF EXISTS "OrganizationMember_organizationId_userId_key" RENAME TO organization_members_organization_id_user_id_key;
ALTER INDEX IF EXISTS "BrandDNA_brandId_key" RENAME TO brand_profiles_brand_id_key;
ALTER INDEX IF EXISTS "LogoVersion_logoId_version_key" RENAME TO generated_logo_versions_logo_id_version_key;
ALTER INDEX IF EXISTS "ComposedPromptRecord_promptRunId_idx" RENAME TO generated_prompts_prompt_run_id_idx;
DROP INDEX IF EXISTS "ComposedPromptRecord_createdAt_idx";
ALTER INDEX IF EXISTS "BrainExperience_createdAt_idx" RENAME TO design_brain_experiences_created_at_idx;
ALTER INDEX IF EXISTS "BrainTasteSignal_createdAt_idx" RENAME TO design_brain_taste_signals_created_at_idx;

ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE organizations RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE organizations RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE organization_members RENAME COLUMN "organizationId" TO organization_id;
ALTER TABLE organization_members RENAME COLUMN "userId" TO user_id;
ALTER TABLE organization_members RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE projects RENAME COLUMN "organizationId" TO organization_id;
ALTER TABLE projects RENAME COLUMN "userId" TO user_id;
ALTER TABLE projects RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE projects RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE brands RENAME COLUMN "organizationId" TO organization_id;
ALTER TABLE brands RENAME COLUMN "projectId" TO project_id;
ALTER TABLE brands RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE brands RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE brand_profiles RENAME COLUMN "brandId" TO brand_id;
ALTER TABLE brand_profiles RENAME COLUMN "visualTraits" TO visual_traits;
ALTER TABLE brand_profiles RENAME COLUMN "principleIds" TO principle_ids;
ALTER TABLE brand_profiles RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE brand_profiles RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE prompt_generation_runs RENAME COLUMN "projectId" TO project_id;
ALTER TABLE prompt_generation_runs RENAME COLUMN "companyName" TO company_name;
ALTER TABLE prompt_generation_runs RENAME COLUMN "bestScore" TO best_score;
ALTER TABLE prompt_generation_runs RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE generated_prompts RENAME COLUMN "promptRunId" TO prompt_run_id;
ALTER TABLE generated_prompts RENAME COLUMN "companyName" TO company_name;
ALTER TABLE generated_prompts RENAME COLUMN "selectedPrinciples" TO selected_principles;
ALTER TABLE generated_prompts RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE generated_prompts RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE generated_logos RENAME COLUMN "brandId" TO brand_id;
ALTER TABLE generated_logos RENAME COLUMN "projectId" TO project_id;
ALTER TABLE generated_logos RENAME COLUMN "svgContent" TO svg_content;
ALTER TABLE generated_logos RENAME COLUMN "promptText" TO prompt_text;
ALTER TABLE generated_logos RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE generated_logos RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE generated_logo_versions RENAME COLUMN "logoId" TO logo_id;
ALTER TABLE generated_logo_versions RENAME COLUMN "svgContent" TO svg_content;
ALTER TABLE generated_logo_versions RENAME COLUMN "promptText" TO prompt_text;
ALTER TABLE generated_logo_versions RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE design_brain_experiences RENAME COLUMN "sourceType" TO source_type;
ALTER TABLE design_brain_experiences RENAME COLUMN "filePath" TO file_path;
ALTER TABLE design_brain_experiences RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE design_brain_experiences RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE design_brain_taste_signals RENAME COLUMN "experienceId" TO experience_id;
ALTER TABLE design_brain_taste_signals RENAME COLUMN "signalType" TO signal_type;
ALTER TABLE design_brain_taste_signals RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE learned_design_principles RENAME COLUMN "ruleText" TO rule_text;
ALTER TABLE learned_design_principles RENAME COLUMN "promptFragment" TO prompt_fragment;
ALTER TABLE learned_design_principles RENAME COLUMN "sourceIds" TO source_ids;
ALTER TABLE learned_design_principles RENAME COLUMN "antiPatterns" TO anti_patterns;
ALTER TABLE learned_design_principles RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE learned_design_principles RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE generated_prompts
  ADD COLUMN organization_id TEXT,
  ADD COLUMN project_id TEXT,
  ADD COLUMN saved_at TIMESTAMP(3);
UPDATE generated_prompts SET saved_at = updated_at WHERE saved = true;

ALTER TABLE generated_logos
  ADD COLUMN organization_id TEXT,
  ADD COLUMN prompt_id TEXT,
  ADD COLUMN storage_key TEXT,
  ADD COLUMN public_url TEXT,
  ADD COLUMN mime_type TEXT,
  ADD COLUMN width INTEGER,
  ADD COLUMN height INTEGER,
  ADD COLUMN provider TEXT,
  ADD COLUMN model TEXT;
ALTER TABLE generated_logo_versions ADD COLUMN storage_key TEXT;
ALTER TABLE design_brain_experiences
  ADD COLUMN organization_id TEXT,
  ADD COLUMN project_id TEXT;
ALTER TABLE design_brain_taste_signals
  ADD COLUMN organization_id TEXT,
  ADD COLUMN project_id TEXT;
ALTER TABLE learned_design_principles
  ADD COLUMN organization_id TEXT,
  ADD COLUMN project_id TEXT;

ALTER TABLE generated_prompts
  ADD CONSTRAINT generated_prompts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT generated_prompts_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE generated_logos
  ADD CONSTRAINT generated_logos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT generated_logos_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES generated_prompts(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE design_brain_experiences
  ADD CONSTRAINT design_brain_experiences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT design_brain_experiences_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE design_brain_taste_signals
  ADD CONSTRAINT design_brain_taste_signals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT design_brain_taste_signals_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE learned_design_principles
  ADD CONSTRAINT learned_design_principles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT learned_design_principles_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP(3),
  last_error TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX outbox_events_idempotency_key_key ON outbox_events(idempotency_key);
CREATE INDEX outbox_events_status_available_at_idx ON outbox_events(status, available_at);

CREATE INDEX organization_members_user_id_idx ON organization_members(user_id);
CREATE INDEX projects_organization_id_created_at_idx ON projects(organization_id, created_at DESC);
CREATE INDEX projects_user_id_idx ON projects(user_id);
CREATE INDEX brands_organization_id_created_at_idx ON brands(organization_id, created_at DESC);
CREATE INDEX brands_project_id_idx ON brands(project_id);
CREATE INDEX prompt_generation_runs_project_id_created_at_idx ON prompt_generation_runs(project_id, created_at DESC);
CREATE INDEX generated_prompts_organization_id_created_at_idx ON generated_prompts(organization_id, created_at DESC);
CREATE INDEX generated_prompts_project_id_created_at_idx ON generated_prompts(project_id, created_at DESC);
CREATE INDEX generated_prompts_saved_at_id_idx ON generated_prompts(saved_at DESC, id DESC);
CREATE INDEX generated_prompts_saved_cursor_idx ON generated_prompts(saved_at DESC, id DESC) WHERE saved = true;
CREATE INDEX generated_logos_project_id_created_at_idx ON generated_logos(project_id, created_at DESC);
CREATE INDEX generated_logos_organization_id_created_at_idx ON generated_logos(organization_id, created_at DESC);
CREATE INDEX generated_logos_brand_id_idx ON generated_logos(brand_id);
CREATE INDEX generated_logos_prompt_id_idx ON generated_logos(prompt_id);
CREATE INDEX design_brain_experiences_tenant_created_at_idx ON design_brain_experiences(organization_id, project_id, created_at DESC);
CREATE INDEX design_brain_taste_signals_tenant_created_at_idx ON design_brain_taste_signals(organization_id, project_id, created_at DESC);
CREATE INDEX learned_design_principles_tenant_confidence_idx ON learned_design_principles(organization_id, project_id, confidence DESC);

CREATE EXTENSION IF NOT EXISTS vector;
DO $$
BEGIN
  IF to_regclass('public.brain_experience_embeddings') IS NOT NULL THEN
    ALTER TABLE brain_experience_embeddings RENAME TO design_brain_experience_embeddings;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS design_brain_experience_embeddings (
  experience_id TEXT PRIMARY KEY,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT design_brain_experience_embeddings_experience_id_fkey
    FOREIGN KEY (experience_id) REFERENCES design_brain_experiences(id) ON DELETE CASCADE
);

COMMIT;
