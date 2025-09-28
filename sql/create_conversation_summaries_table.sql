-- Create conversation summaries table for context management
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES search_conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')) DEFAULT 'neutral',
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Indexes for performance
  CONSTRAINT unique_conversation_summary UNIQUE (conversation_id, created_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_created_at ON conversation_summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_expires_at ON conversation_summaries(expires_at);

-- Enable RLS
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own conversation summaries" ON conversation_summaries
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM search_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own conversation summaries" ON conversation_summaries
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM search_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own conversation summaries" ON conversation_summaries
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM search_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own conversation summaries" ON conversation_summaries
  FOR DELETE USING (
    conversation_id IN (
      SELECT id FROM search_conversations WHERE user_id = auth.uid()
    )
  );
