-- Enable required extensions
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS http;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating extensions: %', SQLERRM;
END $$;

-- Create a function to invoke the Edge Function
CREATE OR REPLACE FUNCTION invoke_check_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key text;
  response http_response;
BEGIN
  -- Log start of execution
  RAISE NOTICE 'Starting check-reminders at %', NOW();
  
  -- Get the service role key from vault or environment
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL THEN
      RAISE EXCEPTION 'Service role key not found';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error getting service role key: %', SQLERRM;
    RETURN;
  END;
  
  -- Make HTTP request to the Edge Function
  BEGIN
    SELECT * INTO response FROM http_post(
      'https://nyobhgvkutpcpxrvcwqo.supabase.co/functions/v1/check-reminders',
      '{}',
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer ' || service_role_key)
      ]
    );
    
    -- Log response
    RAISE NOTICE 'Edge function response: Status %, Body: %', 
      response.status, 
      convert_from(response.content, 'UTF-8');
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error calling edge function: %', SQLERRM;
    RETURN;
  END;
  
  RAISE NOTICE 'Completed check-reminders at %', NOW();
END;
$$;

-- Remove any existing schedules for this job
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE command LIKE '%invoke_check_reminders%';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error unscheduling existing jobs: %', SQLERRM;
END $$;

-- Schedule the new job
SELECT cron.schedule(
  'invoke_check_reminders_job',  -- job name
  '* * * * *',                  -- every minute
  $$SELECT invoke_check_reminders()$$
);
