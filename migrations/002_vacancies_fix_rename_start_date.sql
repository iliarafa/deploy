-- Permanent fix for recurring vacancies table publishing conflicts
-- This migration safely renames previous_tenant_duration to start_date in production
-- and ensures both start_date and end_date columns exist

-- Add start_date and end_date columns if they don't exist
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS start_date timestamp;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS end_date timestamp;

-- Safely rename previous_tenant_duration to start_date if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='vacancies' AND column_name='previous_tenant_duration'
    ) THEN
        -- Backfill start_date from previous_tenant_duration if needed
        UPDATE vacancies
        SET start_date = COALESCE(start_date, previous_tenant_duration::timestamp)
        WHERE previous_tenant_duration IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE vacancies DROP COLUMN previous_tenant_duration;
    END IF;
END $$;