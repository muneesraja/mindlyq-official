-- Create the reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'active',
    recurrence_type TEXT DEFAULT 'none',
    recurrence_days INTEGER[],
    recurrence_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reminders"
    ON reminders FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Users can insert their own reminders"
    ON reminders FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Users can update their own reminders"
    ON reminders FOR UPDATE
    USING (
        auth.uid()::text = user_id
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid()::text = user_id
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Users can delete their own reminders"
    ON reminders FOR DELETE
    USING (
        auth.uid()::text = user_id
        OR auth.role() = 'service_role'
    );

-- Create a function to update recurring reminders
CREATE OR REPLACE FUNCTION update_recurring_reminder(reminder_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r reminders%ROWTYPE;
BEGIN
    -- Get the reminder
    SELECT * INTO r FROM reminders WHERE id = reminder_id;
    
    -- Only process if it's a recurring reminder
    IF r.recurrence_type != 'none' THEN
        -- Calculate next due date based on recurrence type
        CASE r.recurrence_type
            WHEN 'daily' THEN
                UPDATE reminders 
                SET due_date = due_date + interval '1 day'
                WHERE id = reminder_id;
                
            WHEN 'weekly' THEN
                UPDATE reminders 
                SET due_date = due_date + interval '7 days'
                WHERE id = reminder_id;
                
            WHEN 'monthly' THEN
                UPDATE reminders 
                SET due_date = due_date + interval '1 month'
                WHERE id = reminder_id;
        END CASE;
    ELSE
        -- For non-recurring reminders, mark as completed
        UPDATE reminders 
        SET status = 'completed'
        WHERE id = reminder_id;
    END IF;
END;
$$;
