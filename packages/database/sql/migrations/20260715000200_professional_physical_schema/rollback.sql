-- Manual zero-loss rollback. Additive columns/tables are intentionally retained.
SET lock_timeout = '10s';
BEGIN;

ALTER TABLE users RENAME COLUMN created_at TO "createdAt";
ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE organizations RENAME COLUMN created_at TO "createdAt";
ALTER TABLE organizations RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE organization_members RENAME COLUMN organization_id TO "organizationId";
ALTER TABLE organization_members RENAME COLUMN user_id TO "userId";
ALTER TABLE organization_members RENAME COLUMN created_at TO "createdAt";
ALTER TABLE projects RENAME COLUMN organization_id TO "organizationId";
ALTER TABLE projects RENAME COLUMN user_id TO "userId";
ALTER TABLE projects RENAME COLUMN created_at TO "createdAt";
ALTER TABLE projects RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE brands RENAME COLUMN organization_id TO "organizationId";
ALTER TABLE brands RENAME COLUMN project_id TO "projectId";
ALTER TABLE brands RENAME COLUMN created_at TO "createdAt";
ALTER TABLE brands RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE brand_profiles RENAME COLUMN brand_id TO "brandId";
ALTER TABLE brand_profiles RENAME COLUMN visual_traits TO "visualTraits";
ALTER TABLE brand_profiles RENAME COLUMN principle_ids TO "principleIds";
ALTER TABLE brand_profiles RENAME COLUMN created_at TO "createdAt";
ALTER TABLE brand_profiles RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE prompt_generation_runs RENAME COLUMN project_id TO "projectId";
ALTER TABLE prompt_generation_runs RENAME COLUMN company_name TO "companyName";
ALTER TABLE prompt_generation_runs RENAME COLUMN best_score TO "bestScore";
ALTER TABLE prompt_generation_runs RENAME COLUMN created_at TO "createdAt";
ALTER TABLE generated_prompts RENAME COLUMN prompt_run_id TO "promptRunId";
ALTER TABLE generated_prompts RENAME COLUMN company_name TO "companyName";
ALTER TABLE generated_prompts RENAME COLUMN selected_principles TO "selectedPrinciples";
ALTER TABLE generated_prompts RENAME COLUMN created_at TO "createdAt";
ALTER TABLE generated_prompts RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE generated_logos RENAME COLUMN brand_id TO "brandId";
ALTER TABLE generated_logos RENAME COLUMN project_id TO "projectId";
ALTER TABLE generated_logos RENAME COLUMN svg_content TO "svgContent";
ALTER TABLE generated_logos RENAME COLUMN prompt_text TO "promptText";
ALTER TABLE generated_logos RENAME COLUMN created_at TO "createdAt";
ALTER TABLE generated_logos RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE generated_logo_versions RENAME COLUMN logo_id TO "logoId";
ALTER TABLE generated_logo_versions RENAME COLUMN svg_content TO "svgContent";
ALTER TABLE generated_logo_versions RENAME COLUMN prompt_text TO "promptText";
ALTER TABLE generated_logo_versions RENAME COLUMN created_at TO "createdAt";
ALTER TABLE design_brain_experiences RENAME COLUMN source_type TO "sourceType";
ALTER TABLE design_brain_experiences RENAME COLUMN file_path TO "filePath";
ALTER TABLE design_brain_experiences RENAME COLUMN created_at TO "createdAt";
ALTER TABLE design_brain_experiences RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE design_brain_taste_signals RENAME COLUMN experience_id TO "experienceId";
ALTER TABLE design_brain_taste_signals RENAME COLUMN signal_type TO "signalType";
ALTER TABLE design_brain_taste_signals RENAME COLUMN created_at TO "createdAt";
ALTER TABLE learned_design_principles RENAME COLUMN rule_text TO "ruleText";
ALTER TABLE learned_design_principles RENAME COLUMN prompt_fragment TO "promptFragment";
ALTER TABLE learned_design_principles RENAME COLUMN source_ids TO "sourceIds";
ALTER TABLE learned_design_principles RENAME COLUMN anti_patterns TO "antiPatterns";
ALTER TABLE learned_design_principles RENAME COLUMN created_at TO "createdAt";
ALTER TABLE learned_design_principles RENAME COLUMN updated_at TO "updatedAt";

ALTER TABLE users RENAME TO "User";
ALTER TABLE organizations RENAME TO "Organization";
ALTER TABLE organization_members RENAME TO "OrganizationMember";
ALTER TABLE projects RENAME TO "Project";
ALTER TABLE brands RENAME TO "Brand";
ALTER TABLE brand_profiles RENAME TO "BrandDNA";
ALTER TABLE prompt_generation_runs RENAME TO "PromptRun";
ALTER TABLE generated_prompts RENAME TO "ComposedPromptRecord";
ALTER TABLE generated_logos RENAME TO "Logo";
ALTER TABLE generated_logo_versions RENAME TO "LogoVersion";
ALTER TABLE design_brain_experiences RENAME TO "BrainExperience";
ALTER TABLE design_brain_taste_signals RENAME TO "BrainTasteSignal";
ALTER TABLE learned_design_principles RENAME TO "LearnedPrinciple";
ALTER TABLE legacy."DesignPrinciple" SET SCHEMA public;

DO $$
BEGIN
  IF to_regclass('public.design_brain_experience_embeddings') IS NOT NULL
     AND to_regclass('public.brain_experience_embeddings') IS NULL THEN
    ALTER TABLE design_brain_experience_embeddings RENAME TO brain_experience_embeddings;
  END IF;
END $$;

COMMIT;
