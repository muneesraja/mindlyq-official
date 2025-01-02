/*
  # Initial Schema Setup for MindlyQ

  1. New Tables
    - users
      - Stores user information and preferences
    - reminders
      - Stores all reminders with their details
    - content_items
      - Stores shared content (URLs, images, text)
    - categories
      - Stores content categories
    - collaborators
      - Stores reminder collaboration relationships
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free',
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  category_id uuid REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  recurring_pattern JSONB,
  priority TEXT DEFAULT 'medium'
);

-- Content items table
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id uuid REFERENCES categories(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators table
CREATE TABLE IF NOT EXISTS collaborators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id uuid REFERENCES reminders(id),
  user_id uuid REFERENCES users(id),
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reminder_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR 
    id IN (SELECT reminder_id FROM collaborators WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own reminders"
  ON reminders FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own content"
  ON content_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own content"
  ON content_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view collaborations"
  ON collaborators FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR 
    reminder_id IN (SELECT id FROM reminders WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage collaborations"
  ON collaborators FOR ALL
  TO authenticated
  USING (reminder_id IN (SELECT id FROM reminders WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at
    BEFORE UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborators_updated_at
    BEFORE UPDATE ON collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();