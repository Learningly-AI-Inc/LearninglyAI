-- TARGETED CLEANUP SCRIPT
-- Remove ALL tables except the 6 consolidated ones that were migrated to

-- ===========================================
-- DROP ALL TABLES EXCEPT THE 6 CONSOLIDATED ONES
-- ===========================================

-- Keep these 6 tables (DO NOT DROP):
-- - user_data
-- - documents  
-- - conversations
-- - messages
-- - generated_content
-- - sessions

-- Drop all other tables:

-- AI and logging tables
DROP TABLE IF EXISTS ai_model_logs CASCADE;

-- Conversation related
DROP TABLE IF EXISTS conversation_summaries CASCADE;

-- Download and export
DROP TABLE IF EXISTS download_history CASCADE;
DROP TABLE IF EXISTS export_queue CASCADE;

-- Exam prep tables
DROP TABLE IF EXISTS exam_prep_documents CASCADE;
DROP TABLE IF EXISTS exam_prep_flashcard_progress CASCADE;
DROP TABLE IF EXISTS exam_prep_flashcards CASCADE;
DROP TABLE IF EXISTS exam_prep_processing_queue CASCADE;
DROP TABLE IF EXISTS exam_prep_questions CASCADE;
DROP TABLE IF EXISTS exam_prep_results CASCADE;
DROP TABLE IF EXISTS exam_prep_sessions CASCADE;
DROP TABLE IF EXISTS exam_prep_user_answers CASCADE;

-- Summary and content tables
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS user_content CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Version control and writing
DROP TABLE IF EXISTS version_control CASCADE;
DROP TABLE IF EXISTS writing_history CASCADE;

-- ===========================================
-- VERIFY CLEANUP - CHECK REMAINING TABLES
-- ===========================================

-- Show count of consolidated tables
SELECT 'Consolidated Tables Count' as status,
       (SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_data', 'documents', 'conversations', 'messages', 'generated_content', 'sessions')) as consolidated_count;

-- List ALL remaining tables
SELECT 'Remaining Tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

-- ✅ Cleanup completed!
-- Your database now has only the 6 consolidated tables:
-- 1. user_data (user info, subscriptions, usage)
-- 2. documents (all document types)  
-- 3. conversations (all chat types)
-- 4. messages (all chat messages)
-- 5. generated_content (AI-generated content)
-- 6. sessions (user activity sessions)

-- 🎉 Database consolidation is complete!
