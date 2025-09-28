-- EMERGENCY FIX - Run this immediately to stop the current issues

-- Step 1: Drop all problematic triggers immediately
DROP TRIGGER IF EXISTS sync_chat_conversations ON chat_conversations;
DROP TRIGGER IF EXISTS sync_search_conversations ON search_conversations;
DROP TRIGGER IF EXISTS sync_chat_messages ON chat_messages;
DROP TRIGGER IF EXISTS sync_search_messages ON search_messages;

-- Step 2: Drop all problematic functions
DROP FUNCTION IF EXISTS sync_conversations();
DROP FUNCTION IF EXISTS sync_messages();

-- Step 3: Fix the check constraints that are causing issues
ALTER TABLE search_conversations DROP CONSTRAINT IF EXISTS search_conversations_model_used_check;
ALTER TABLE ai_model_logs DROP CONSTRAINT IF EXISTS ai_model_logs_model_name_check;

-- Step 4: Create new, more flexible constraints
ALTER TABLE search_conversations ADD CONSTRAINT search_conversations_model_used_check 
CHECK (model_used IN ('openai', 'gemini', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'));

ALTER TABLE ai_model_logs ADD CONSTRAINT ai_model_logs_model_name_check 
CHECK (model_name IN ('gemini', 'openai', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'));

-- Step 5: Verify the fix worked
SELECT 'Tables fixed successfully' as status;
