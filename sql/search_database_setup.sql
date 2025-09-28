-- Search Database Setup for Learningly AI
-- Run these commands in your Supabase SQL Editor

-- Search Conversations Table: Stores chat conversations
CREATE TABLE IF NOT EXISTS search_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model_used TEXT CHECK(model_used IN ('openai', 'gemini')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Messages Table: Stores individual messages in conversations
CREATE TABLE IF NOT EXISTS search_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES search_conversations(id) ON DELETE CASCADE,
    role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB, -- Array of source documents
    model_used TEXT CHECK(model_used IN ('openai', 'gemini')),
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Settings Table: Stores user preferences for search
CREATE TABLE IF NOT EXISTS search_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    default_model TEXT CHECK(default_model IN ('openai', 'gemini')) DEFAULT 'gemini',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_conversations_user_id ON search_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_search_messages_conversation_id ON search_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_search_messages_created_at ON search_messages(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_search_conversations_updated_at ON search_conversations;
CREATE TRIGGER update_search_conversations_updated_at 
    BEFORE UPDATE ON search_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_search_settings_updated_at ON search_settings;
CREATE TRIGGER update_search_settings_updated_at 
    BEFORE UPDATE ON search_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE search_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for search_conversations
CREATE POLICY "Users can view their own conversations" ON search_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON search_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON search_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON search_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for search_messages
CREATE POLICY "Users can view messages from their conversations" ON search_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM search_conversations 
            WHERE search_conversations.id = search_messages.conversation_id 
            AND search_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to their conversations" ON search_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM search_conversations 
            WHERE search_conversations.id = search_messages.conversation_id 
            AND search_conversations.user_id = auth.uid()
        )
    );

-- Create RLS policies for search_settings
CREATE POLICY "Users can view their own settings" ON search_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON search_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON search_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON search_conversations TO authenticated;
GRANT ALL ON search_messages TO authenticated;
GRANT ALL ON search_settings TO authenticated;
GRANT USAGE ON SEQUENCE search_conversations_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE search_messages_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE search_settings_id_seq TO authenticated;

