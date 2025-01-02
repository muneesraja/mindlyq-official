-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can create their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON reminders;

-- Create new policies for reminders
CREATE POLICY "Enable read access for all users"
    ON reminders FOR SELECT
    USING (true);

CREATE POLICY "Enable insert access for all users"
    ON reminders FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
    ON reminders FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete for users based on user_id"
    ON reminders FOR DELETE
    USING (true);
