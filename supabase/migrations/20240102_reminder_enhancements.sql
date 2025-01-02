-- Add recurring reminder support
ALTER TABLE reminders
ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly')),
ADD COLUMN recurrence_days INTEGER[], -- For weekly reminders (0 = Sunday, 1 = Monday, etc.)
ADD COLUMN recurrence_time TIME; -- For daily/weekly reminders

-- Add validation trigger
CREATE OR REPLACE FUNCTION validate_reminder_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if due_date is in the past
    IF NEW.due_date < CURRENT_TIMESTAMP AND NEW.recurrence_type = 'none' THEN
        RAISE EXCEPTION 'Cannot set reminder in the past';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_reminder_time
    BEFORE INSERT OR UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION validate_reminder_time();
