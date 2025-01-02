-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reminders';

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'reminders';

-- Check if CRON job is scheduled
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'check-reminders-job';

-- Try to insert a test reminder
INSERT INTO reminders (
    user_id,
    title,
    description,
    due_date,
    status,
    recurrence_type
) VALUES (
    '+918778604904',
    'Test Reminder',
    'This is a test reminder',
    NOW() + interval '1 minute',
    'active',
    'none'
) RETURNING *;
