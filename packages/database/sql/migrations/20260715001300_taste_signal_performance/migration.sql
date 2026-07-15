-- Taste metadata is analytical data, not image storage. Historical data URLs made
-- a few hundred rows occupy tens of megabytes and stalled prompt generation.
UPDATE design_brain_taste_signals
SET metadata = metadata - 'imageUrl'
WHERE metadata ? 'imageUrl';

-- The existing (organization_id, project_id, created_at) index cannot efficiently
-- serve organization-wide profiles because project_id is the middle key.
CREATE INDEX IF NOT EXISTS design_brain_taste_signals_org_created_at_idx
  ON design_brain_taste_signals (organization_id, created_at DESC);
