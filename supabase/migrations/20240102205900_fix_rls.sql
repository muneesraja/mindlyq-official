-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON reminders;

-- Create new policies that allow service role to bypass
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

-- Try inserting a test reminder again
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
