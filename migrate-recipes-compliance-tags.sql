-- Add recipe compliance tags storage for menu compliance checking.
-- Column: compliance_tags JSONB
--
-- Run this in Neon/Postgres once.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'recipes'
      AND column_name = 'compliance_tags'
  ) THEN
    ALTER TABLE recipes
    ADD COLUMN compliance_tags JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END$$;

