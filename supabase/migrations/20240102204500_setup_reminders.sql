-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "http";

-- Create the reminder_job_logs table
CREATE TABLE IF NOT EXISTS reminder_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL,
    message TEXT,
    error TEXT
);

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

-- Create indexes
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

-- Create the function to invoke Edge Function
CREATE OR REPLACE FUNCTION invoke_check_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    edge_function_url text;
    request_id bigint;
BEGIN
    -- Log execution start
    INSERT INTO reminder_job_logs(status, message)
    VALUES ('STARTING', 'Beginning reminder check execution');
    
    BEGIN
        -- Get URL from environment
        edge_function_url := rtrim(current_setting('PROJECT_URL'), '/') 
                            || '/functions/v1/check-reminders';
                            
        -- Log the URL (safe to show)
        INSERT INTO reminder_job_logs(status, message)
        VALUES ('INFO', format('Calling Edge Function at: %s', edge_function_url));
        
        -- Make HTTP request to the Edge Function
        SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('SERVICE_ROLE_KEY')
            ),
            body := '{}'
        ) INTO request_id;
        
        INSERT INTO reminder_job_logs(status, message)
        VALUES ('SUCCESS', format('Edge function call initiated with request_id: %s', request_id::text));
        
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO reminder_job_logs(status, message, error)
        VALUES ('ERROR', 'Failed to call edge function', SQLERRM);
        RAISE;
    END;
END;
$$;

-- Schedule the CRON job (runs every minute)
SELECT cron.schedule(
    'check-reminders-job',
    '* * * * *',
    'SELECT invoke_check_reminders()'
);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reminders"
    ON reminders FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own reminders"
    ON reminders FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own reminders"
    ON reminders FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own reminders"
    ON reminders FOR DELETE
    USING (auth.uid()::text = user_id);
