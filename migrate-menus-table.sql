-- This script restructures the menus table to store one row per week instead of one row per day.
-- Daily menu details will be stored in JSONB columns.

BEGIN;

-- 1. Add new JSONB columns to store the structured data for each day and daily options.
ALTER TABLE menus ADD COLUMN monday JSONB;
ALTER TABLE menus ADD COLUMN tuesday JSONB;
ALTER TABLE menus ADD COLUMN wednesday JSONB;
ALTER TABLE menus ADD COLUMN thursday JSONB;
ALTER TABLE menus ADD COLUMN friday JSONB;
ALTER TABLE menus ADD COLUMN daily_options JSONB;

-- 2. Migrate existing data from the old column structure to the new JSONB columns.
-- This creates a temporary table with the migrated data.
CREATE TEMP TABLE migrated_menus AS
SELECT
    week_start_date,
    MAX(name) as name,
    -- Aggregate data for Monday
    jsonb_build_object(
        'lunchOption1', MAX(CASE WHEN day_of_week = 'monday' THEN lunch_option_1 END),
        'lunchOption2', MAX(CASE WHEN day_of_week = 'monday' THEN lunch_option_2 END),
        'lunchOption3', MAX(CASE WHEN day_of_week = 'monday' THEN lunch_option_3 END),
        'servedWith123', MAX(CASE WHEN day_of_week = 'monday' THEN served_with_123 END),
        'dessertOptionD', MAX(CASE WHEN day_of_week = 'monday' THEN dessert_option_d END)
    ) as monday,
    -- Aggregate data for Tuesday
    jsonb_build_object(
        'lunchOption1', MAX(CASE WHEN day_of_week = 'tuesday' THEN lunch_option_1 END),
        'lunchOption2', MAX(CASE WHEN day_of_week = 'tuesday' THEN lunch_option_2 END),
        'lunchOption3', MAX(CASE WHEN day_of_week = 'tuesday' THEN lunch_option_3 END),
        'servedWith123', MAX(CASE WHEN day_of_week = 'tuesday' THEN served_with_123 END),
        'dessertOptionD', MAX(CASE WHEN day_of_week = 'tuesday' THEN dessert_option_d END)
    ) as tuesday,
    -- ... and so on for Wednesday, Thursday, Friday
    jsonb_build_object(
        'lunchOption1', MAX(CASE WHEN day_of_week = 'wednesday' THEN lunch_option_1 END),
        'lunchOption2', MAX(CASE WHEN day_of_week = 'wednesday' THEN lunch_option_2 END),
        'lunchOption3', MAX(CASE WHEN day_of_week = 'wednesday' THEN lunch_option_3 END),
        'servedWith123', MAX(CASE WHEN day_of_week = 'wednesday' THEN served_with_123 END),
        'dessertOptionD', MAX(CASE WHEN day_of_week = 'wednesday' THEN dessert_option_d END)
    ) as wednesday,
    jsonb_build_object(
        'lunchOption1', MAX(CASE WHEN day_of_week = 'thursday' THEN lunch_option_1 END),
        'lunchOption2', MAX(CASE WHEN day_of_week = 'thursday' THEN lunch_option_2 END),
        'lunchOption3', MAX(CASE WHEN day_of_week = 'thursday' THEN lunch_option_3 END),
        'servedWith123', MAX(CASE WHEN day_of_week = 'thursday' THEN served_with_123 END),
        'dessertOptionD', MAX(CASE WHEN day_of_week = 'thursday' THEN dessert_option_d END)
    ) as thursday,
    jsonb_build_object(
        'lunchOption1', MAX(CASE WHEN day_of_week = 'friday' THEN lunch_option_1 END),
        'lunchOption2', MAX(CASE WHEN day_of_week = 'friday' THEN lunch_option_2 END),
        'lunchOption3', MAX(CASE WHEN day_of_week = 'friday' THEN lunch_option_3 END),
        'servedWith123', MAX(CASE WHEN day_of_week = 'friday' THEN served_with_123 END),
        'dessertOptionD', MAX(CASE WHEN day_of_week = 'friday' THEN dessert_option_d END)
    ) as friday,
    -- Aggregate daily options (assuming they are the same for all days of the week)
    jsonb_build_object(
        'option1', MAX(daily_option_1),
        'option2', MAX(daily_option_2),
        'option3', MAX(daily_option_3),
        'option4', MAX(daily_option_4)
    ) as daily_options
FROM
    menus
GROUP BY
    week_start_date;

-- 3. Clear the original menus table.
-- We are using DELETE instead of TRUNCATE to be safe within a transaction.
DELETE FROM menus;

-- 4. Re-insert the consolidated data back into the menus table.
INSERT INTO menus (week_start_date, name, monday, tuesday, wednesday, thursday, friday, daily_options)
SELECT week_start_date, name, monday, tuesday, wednesday, thursday, friday, daily_options FROM migrated_menus;

-- 5. Drop the old, now redundant columns.
ALTER TABLE menus DROP COLUMN day_of_week;
ALTER TABLE menus DROP COLUMN lunch_option_1;
ALTER TABLE menus DROP COLUMN lunch_option_2;
ALTER TABLE menus DROP COLUMN lunch_option_3;
ALTER TABLE menus DROP COLUMN served_with_123;
ALTER TABLE menus DROP COLUMN dessert_option_d;
ALTER TABLE menus DROP COLUMN daily_option_1;
ALTER TABLE menus DROP COLUMN daily_option_2;
ALTER TABLE menus DROP COLUMN daily_option_3;
ALTER TABLE menus DROP COLUMN daily_option_4;

-- 6. Add a UNIQUE constraint on week_start_date to ensure one row per week.
ALTER TABLE menus ADD CONSTRAINT unique_week_start_date UNIQUE (week_start_date);

COMMIT;
