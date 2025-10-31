-- Contact Messages Table: Stores contact form submissions from landing page and elsewhere
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT DEFAULT 'landing_contact',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for safety
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Privacy-first: no SELECT/UPDATE/DELETE policies by default.
-- Admin/service role can access all rows. Optionally allow users to read their own rows if user_id is present:
DO $$ BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Users can read their own contact messages'
  ) THEN
    CREATE POLICY "Users can read their own contact messages" ON contact_messages
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- (Optional) Allow users to insert their own messages when authenticated; landing page will use service role insert.
DO $$ BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Users can insert their own contact messages'
  ) THEN
    CREATE POLICY "Users can insert their own contact messages" ON contact_messages
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

