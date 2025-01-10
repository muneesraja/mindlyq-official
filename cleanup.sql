-- Update all non-recurring reminders to have the correct type and status
UPDATE "Reminder"
SET status = 'completed',
    recurrence_type = 'none'
WHERE recurrence_type NOT IN ('daily', 'weekly')
  AND status = 'active';
