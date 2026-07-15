-- Expand/backfill stage. Legacy JSON remains for rollback and dual-write.
INSERT INTO generated_logos (
  id,
  name,
  organization_id,
  prompt_id,
  status,
  public_url,
  prompt_text,
  provider,
  model,
  width,
  height,
  metadata,
  created_at,
  updated_at
)
SELECT
  logo->>'id',
  COALESCE(NULLIF(prompt.company_name, ''), 'Generated logo'),
  prompt.organization_id,
  prompt.id,
  'DRAFT'::"LogoStatus",
  logo->>'url',
  logo->>'prompt',
  logo->>'provider',
  logo->>'model',
  CASE WHEN logo->>'width' ~ '^[0-9]+$' THEN (logo->>'width')::INTEGER END,
  CASE WHEN logo->>'height' ~ '^[0-9]+$' THEN (logo->>'height')::INTEGER END,
  jsonb_build_object('feedback', COALESCE(logo->'feedback', 'null'::jsonb)),
  prompt.created_at,
  prompt.updated_at
FROM generated_prompts AS prompt
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(prompt.logos) = 'array' THEN prompt.logos ELSE '[]'::jsonb END
) AS logo
WHERE logo ? 'id'
  AND logo ? 'url'
ON CONFLICT (id) DO UPDATE SET
  prompt_id = EXCLUDED.prompt_id,
  public_url = EXCLUDED.public_url,
  prompt_text = EXCLUDED.prompt_text,
  provider = EXCLUDED.provider,
  model = EXCLUDED.model,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;
