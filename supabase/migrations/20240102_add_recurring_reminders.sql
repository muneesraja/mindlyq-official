-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS check_reminder_time ON reminders;
DROP FUNCTION IF EXISTS validate_reminder_time();

-- Add columns for recurring reminders if they don't exist
DO $$ 
BEGIN 
    -- Add recurrence_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reminders' AND column_name = 'recurrence_type') THEN
        ALTER TABLE reminders 
        ADD COLUMN recurrence_type TEXT DEFAULT 'none' 
        CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly'));
    END IF;

    -- Add recurrence_days column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reminders' AND column_name = 'recurrence_days') THEN
        ALTER TABLE reminders 
        ADD COLUMN recurrence_days INTEGER[];
    END IF;

    -- Add recurrence_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reminders' AND column_name = 'recurrence_time') THEN
        ALTER TABLE reminders 
        ADD COLUMN recurrence_time TIME;
    END IF;
END $$;

-- Create or replace the validation function
CREATE OR REPLACE FUNCTION validate_reminder_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if due_date is in the past for non-recurring reminders
    IF NEW.due_date < CURRENT_TIMESTAMP AND NEW.recurrence_type = 'none' THEN
        RAISE EXCEPTION 'Cannot set reminder in the past';
    END IF;
    
    -- Set default recurrence_type if not provided
    IF NEW.recurrence_type IS NULL THEN
        NEW.recurrence_type := 'none';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_reminder_time
    BEFORE INSERT OR UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION validate_reminder_time();
