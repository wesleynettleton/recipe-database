-- Apply the configured default daily options to existing menus.
--
-- For each option slot:
-- - if the default slot has a recipe id, overwrite that slot on every menu
-- - if the default slot is blank/null, keep the menu's current value for that slot
--
-- Run this after saving defaults on /settings/daily-options.

BEGIN;

WITH defaults AS (
    SELECT value
    FROM app_settings
    WHERE key = 'default_daily_options'
)
UPDATE menus AS m
SET
    daily_options = jsonb_build_object(
        'option1', CASE WHEN defaults.value->'option1' IS NULL OR defaults.value->'option1' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option1' ELSE defaults.value->'option1' END,
        'option2', CASE WHEN defaults.value->'option2' IS NULL OR defaults.value->'option2' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option2' ELSE defaults.value->'option2' END,
        'option3', CASE WHEN defaults.value->'option3' IS NULL OR defaults.value->'option3' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option3' ELSE defaults.value->'option3' END,
        'option4', CASE WHEN defaults.value->'option4' IS NULL OR defaults.value->'option4' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option4' ELSE defaults.value->'option4' END,
        'option5', CASE WHEN defaults.value->'option5' IS NULL OR defaults.value->'option5' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option5' ELSE defaults.value->'option5' END,
        'option6', CASE WHEN defaults.value->'option6' IS NULL OR defaults.value->'option6' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option6' ELSE defaults.value->'option6' END,
        'option7', CASE WHEN defaults.value->'option7' IS NULL OR defaults.value->'option7' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option7' ELSE defaults.value->'option7' END,
        'option8', CASE WHEN defaults.value->'option8' IS NULL OR defaults.value->'option8' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option8' ELSE defaults.value->'option8' END,
        'option9', CASE WHEN defaults.value->'option9' IS NULL OR defaults.value->'option9' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option9' ELSE defaults.value->'option9' END,
        'option10', CASE WHEN defaults.value->'option10' IS NULL OR defaults.value->'option10' = 'null'::jsonb THEN COALESCE(m.daily_options, '{}'::jsonb)->'option10' ELSE defaults.value->'option10' END
    ),
    updated_at = CURRENT_TIMESTAMP
FROM defaults;

COMMIT;
