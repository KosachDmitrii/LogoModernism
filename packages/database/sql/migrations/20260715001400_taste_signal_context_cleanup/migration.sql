-- Older logo feedback appended a complete data URL to the human-readable
-- context. Keep the useful text before it and remove the image bytes.
UPDATE design_brain_taste_signals
SET context = LEFT(
  CASE
    WHEN POSITION('data:image/' IN context) > 0
      THEN RTRIM(LEFT(context, POSITION('data:image/' IN context) - 1))
    ELSE context
  END,
  4000
)
WHERE LENGTH(context) > 4000
   OR POSITION('data:image/' IN context) > 0;
