DO $$
DECLARE
  global_organization_id TEXT;
BEGIN
  SELECT id
    INTO global_organization_id
  FROM public.organizations
  WHERE slug = 'logo-modernism';

  IF global_organization_id IS NULL THEN
    RAISE EXCEPTION 'Global Brain organization "logo-modernism" does not exist';
  END IF;

  UPDATE public.design_brain_experiences
  SET organization_id = global_organization_id,
      project_id = NULL
  WHERE organization_id IS NULL;

  UPDATE public.design_brain_taste_signals
  SET organization_id = global_organization_id,
      project_id = NULL
  WHERE organization_id IS NULL;

  UPDATE public.learned_design_principles
  SET organization_id = global_organization_id,
      project_id = NULL
  WHERE organization_id IS NULL;

  UPDATE public.generated_prompts
  SET organization_id = global_organization_id
  WHERE organization_id IS NULL;

  UPDATE public.generated_logos
  SET organization_id = global_organization_id
  WHERE organization_id IS NULL;
END
$$;
