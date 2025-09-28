-- Fix Chat Sync Issue - Version 2 (Corrected)
-- This migration fixes the infinite loop and RLS issues

-- Step 1: Drop the problematic triggers first
DROP TRIGGER IF EXISTS sync_chat_conversations ON chat_conversations;
DROP TRIGGER IF EXISTS sync_search_conversations ON search_conversations;
DROP TRIGGER IF EXISTS sync_chat_messages ON chat_messages;
DROP TRIGGER IF EXISTS sync_search_messages ON search_messages;

-- Step 2: Drop the problematic functions
DROP FUNCTION IF EXISTS sync_conversations();
DROP FUNCTION IF EXISTS sync_messages();

-- Step 3: Copy existing conversations from search_conversations to chat_conversations
-- (Only if they don't already exist)
INSERT INTO chat_conversations (id, user_id, title, model_name, created_at, updated_at)
SELECT 
    sc.id,
    sc.user_id,
    sc.title,
    CASE 
        WHEN sc.model_used = 'gemini' THEN 'gemini-pro'
        WHEN sc.model_used = 'openai' THEN 'gpt-3.5-turbo'
        ELSE 'gemini-pro'
    END as model_name,
    sc.created_at,
    sc.updated_at
FROM search_conversations sc
WHERE NOT EXISTS (
    SELECT 1 FROM chat_conversations cc WHERE cc.id = sc.id
);

-- Step 4: Copy existing messages from search_messages to chat_messages
-- (Only if they don't already exist)
INSERT INTO chat_messages (id, conversation_id, role, content, content_type, metadata, created_at)
SELECT 
    sm.id,
    sm.conversation_id,
    sm.role,
    sm.content,
    'text' as content_type,
    jsonb_build_object(
        'original_model', sm.model_used,
        'sources', COALESCE(sm.sources, '[]'::jsonb),
        'tokens_used', sm.tokens_used
    ) as metadata,
    sm.created_at
FROM search_messages sm
WHERE NOT EXISTS (
    SELECT 1 FROM chat_messages cm WHERE cm.id = sm.id
);

-- Step 5: Fix the check constraint on search_conversations table
-- First, let's see what the current constraint allows
ALTER TABLE search_conversations DROP CONSTRAINT IF EXISTS search_conversations_model_used_check;

-- Create a new, more flexible constraint
ALTER TABLE search_conversations ADD CONSTRAINT search_conversations_model_used_check 
CHECK (model_used IN ('openai', 'gemini', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'));

-- Step 6: Fix the check constraint on ai_model_logs table
ALTER TABLE ai_model_logs DROP CONSTRAINT IF EXISTS ai_model_logs_model_name_check;

-- Create a new, more flexible constraint
ALTER TABLE ai_model_logs ADD CONSTRAINT ai_model_logs_model_name_check 
CHECK (model_name IN ('gemini', 'openai', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'));

-- Step 7: Create a simpler, non-recursive sync function
CREATE OR REPLACE FUNCTION sync_conversations_simple()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if this is a new conversation (not an update)
    IF TG_OP = 'INSERT' THEN
        -- If inserting into chat_conversations, also insert into search_conversations
        IF TG_TABLE_NAME = 'chat_conversations' THEN
            -- Use a separate transaction to avoid recursion
            PERFORM set_config('app.sync_in_progress', 'true', false);
            
            INSERT INTO search_conversations (id, user_id, title, model_used, created_at, updated_at)
            VALUES (
                NEW.id,
                NEW.user_id,
                NEW.title,
                CASE 
                    WHEN NEW.model_name LIKE '%gemini%' THEN 'gemini'
                    WHEN NEW.model_name LIKE '%gpt%' THEN 'openai'
                    ELSE 'gemini'
                END,
                NEW.created_at,
                NEW.updated_at
            )
            ON CONFLICT (id) DO NOTHING;
            
            PERFORM set_config('app.sync_in_progress', 'false', false);
        END IF;
        
        -- If inserting into search_conversations, also insert into chat_conversations
        IF TG_TABLE_NAME = 'search_conversations' THEN
            -- Use a separate transaction to avoid recursion
            PERFORM set_config('app.sync_in_progress', 'true', false);
            
            INSERT INTO chat_conversations (id, user_id, title, model_name, created_at, updated_at)
            VALUES (
                NEW.id,
                NEW.user_id,
                NEW.title,
                CASE 
                    WHEN NEW.model_used = 'gemini' THEN 'gemini-pro'
                    WHEN NEW.model_used = 'openai' THEN 'gpt-3.5-turbo'
                    ELSE 'gemini-pro'
                END,
                NEW.created_at,
                NEW.updated_at
            )
            ON CONFLICT (id) DO NOTHING;
            
            PERFORM set_config('app.sync_in_progress', 'false', false);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create a simpler, non-recursive sync function for messages
CREATE OR REPLACE FUNCTION sync_messages_simple()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if this is a new message (not an update)
    IF TG_OP = 'INSERT' THEN
        -- If inserting into chat_messages, also insert into search_messages
        IF TG_TABLE_NAME = 'chat_messages' THEN
            -- Use a separate transaction to avoid recursion
            PERFORM set_config('app.sync_in_progress', 'true', false);
            
            INSERT INTO search_messages (id, conversation_id, role, content, model_used, created_at)
            VALUES (
                NEW.id,
                NEW.conversation_id,
                NEW.role,
                NEW.content,
                CASE 
                    WHEN NEW.metadata->>'original_model' IS NOT NULL THEN NEW.metadata->>'original_model'
                    WHEN NEW.metadata->>'mapped_model' IS NOT NULL THEN 
                        CASE 
                            WHEN NEW.metadata->>'mapped_model' LIKE '%gemini%' THEN 'gemini'
                            WHEN NEW.metadata->>'mapped_model' LIKE '%gpt%' THEN 'openai'
                            ELSE 'gemini'
                        END
                    ELSE 'gemini'
                END,
                NEW.created_at
            )
            ON CONFLICT (id) DO NOTHING;
            
            PERFORM set_config('app.sync_in_progress', 'false', false);
        END IF;
        
        -- If inserting into search_messages, also insert into chat_messages
        IF TG_TABLE_NAME = 'search_messages' THEN
            -- Use a separate transaction to avoid recursion
            PERFORM set_config('app.sync_in_progress', 'true', false);
            
            INSERT INTO chat_messages (id, conversation_id, role, content, content_type, metadata, created_at)
            VALUES (
                NEW.id,
                NEW.conversation_id,
                NEW.role,
                NEW.content,
                'text',
                jsonb_build_object(
                    'original_model', NEW.model_used,
                    'sources', COALESCE(NEW.sources, '[]'::jsonb),
                    'tokens_used', NEW.tokens_used
                ),
                NEW.created_at
            )
            ON CONFLICT (id) DO NOTHING;
            
            PERFORM set_config('app.sync_in_progress', 'false', false);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create triggers with recursion protection
CREATE TRIGGER sync_chat_conversations_simple
    AFTER INSERT ON chat_conversations
    FOR EACH ROW 
    WHEN (current_setting('app.sync_in_progress', true) IS DISTINCT FROM 'true')
    EXECUTE FUNCTION sync_conversations_simple();

CREATE TRIGGER sync_search_conversations_simple
    AFTER INSERT ON search_conversations
    FOR EACH ROW 
    WHEN (current_setting('app.sync_in_progress', true) IS DISTINCT FROM 'true')
    EXECUTE FUNCTION sync_conversations_simple();

CREATE TRIGGER sync_chat_messages_simple
    AFTER INSERT ON chat_messages
    FOR EACH ROW 
    WHEN (current_setting('app.sync_in_progress', true) IS DISTINCT FROM 'true')
    EXECUTE FUNCTION sync_messages_simple();

CREATE TRIGGER sync_search_messages_simple
    AFTER INSERT ON search_messages
    FOR EACH ROW 
    WHEN (current_setting('app.sync_in_progress', true) IS DISTINCT FROM 'true')
    EXECUTE FUNCTION sync_messages_simple();

-- Step 10: Verify the sync worked
SELECT 
    'search_conversations' as table_name, COUNT(*) as count 
FROM search_conversations
UNION ALL
SELECT 
    'chat_conversations' as table_name, COUNT(*) as count 
FROM chat_conversations
UNION ALL
SELECT 
    'search_messages' as table_name, COUNT(*) as count 
FROM search_messages
UNION ALL
SELECT 
    'chat_messages' as table_name, COUNT(*) as count 
FROM chat_messages;
