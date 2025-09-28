-- Reset Search Tables - Run this in your Supabase SQL editor

-- Drop existing search tables
DROP TABLE IF EXISTS search_messages CASCADE;
DROP TABLE IF EXISTS search_conversations CASCADE;

-- Recreate search_conversations table
CREATE TABLE search_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model_used TEXT NOT NULL DEFAULT 'gemini',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate search_messages table
CREATE TABLE search_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES search_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT NULL,
    model_used TEXT DEFAULT NULL,
    tokens_used INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE search_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for search_conversations
CREATE POLICY "Users can manage their own conversations" ON search_conversations
    FOR ALL USING (auth.uid() = user_id);

-- Simple RLS policies for search_messages  
CREATE POLICY "Users can manage their own messages" ON search_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM search_conversations 
            WHERE search_conversations.id = search_messages.conversation_id 
            AND search_conversations.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX idx_search_conversations_user_id ON search_conversations(user_id);
CREATE INDEX idx_search_conversations_updated_at ON search_conversations(updated_at DESC);
CREATE INDEX idx_search_messages_conversation_id ON search_messages(conversation_id);
CREATE INDEX idx_search_messages_created_at ON search_messages(created_at);

-- Verify tables were created
SELECT 'search_conversations' as table_name, count(*) as row_count FROM search_conversations
UNION ALL
SELECT 'search_messages' as table_name, count(*) as row_count FROM search_messages;
