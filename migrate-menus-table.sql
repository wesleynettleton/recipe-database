-- This script restructures the menus table to store one row per week instead of one row per day.
-- Daily menu details will be stored in JSONB columns.

BEGIN;

-- Create a backup of the current menus table
CREATE TABLE menus_backup AS TABLE menus;

-- Drop the existing menus table
DROP TABLE menus;

-- Recreate the menus table with the correct structure
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    week_start_date DATE NOT NULL UNIQUE,
    monday JSONB,
    tuesday JSONB,
    wednesday JSONB,
    thursday JSONB,
    friday JSONB,
    daily_options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- This script does not migrate old data as it was causing issues.
-- New menus created by the application will use the correct structure.

COMMIT;
