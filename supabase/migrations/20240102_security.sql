-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for reminders
CREATE POLICY "Users can view their own reminders"
    ON reminders FOR SELECT
    USING (user_id = current_user);

CREATE POLICY "Users can create their own reminders"
    ON reminders FOR INSERT
    WITH CHECK (true);  -- We handle user_id check in the application

CREATE POLICY "Users can update their own reminders"
    ON reminders FOR UPDATE
    USING (user_id = current_user);

CREATE POLICY "Users can delete their own reminders"
    ON reminders FOR DELETE
    USING (user_id = current_user);

-- Create policies for content_items
CREATE POLICY "Users can view their own content"
    ON content_items FOR SELECT
    USING (user_id = current_user);

CREATE POLICY "Users can create their own content"
    ON content_items FOR INSERT
    WITH CHECK (true);  -- We handle user_id check in the application

CREATE POLICY "Users can update their own content"
    ON content_items FOR UPDATE
    USING (user_id = current_user);

CREATE POLICY "Users can delete their own content"
    ON content_items FOR DELETE
    USING (user_id = current_user);

-- Create policies for categories
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (user_id = current_user);

CREATE POLICY "Users can create their own categories"
    ON categories FOR INSERT
    WITH CHECK (true);  -- We handle user_id check in the application

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (user_id = current_user);

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (user_id = current_user);

-- Create policies for content_categories
CREATE POLICY "Users can view their own content_categories"
    ON content_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM content_items ci
            WHERE ci.id = content_id
            AND ci.user_id = current_user
        )
    );

CREATE POLICY "Users can manage their own content_categories"
    ON content_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM content_items ci
            WHERE ci.id = content_id
            AND ci.user_id = current_user
        )
    );
