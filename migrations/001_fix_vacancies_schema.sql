-- Migration to resolve vacancies table schema conflicts
-- This fixes the publishing conflict between previous_tenant_duration and start_date

-- Drop the old column if it exists (assuming no important data to preserve)
ALTER TABLE vacancies DROP COLUMN IF EXISTS previous_tenant_duration;

-- Ensure start_date and end_date columns exist with correct types
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS start_date timestamp;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS end_date timestamp;

-- Ensure all required columns exist
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS property text;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS apartment_number text;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS created_at timestamp;

-- Set default values for required columns if they don't have values
UPDATE vacancies SET status = 'vacant' WHERE status IS NULL;
UPDATE vacancies SET created_at = NOW() WHERE created_at IS NULL;