-- COMPLETE CLEANUP SCRIPT
-- This will drop ALL tables except the 6 consolidated ones
-- Keep only: user_data, documents, conversations, messages, generated_content, sessions

-- ===========================================
-- DROP ALL OLD TABLES
-- ===========================================

-- Drop old subscription-related tables
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS user_usage CASCADE;
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Drop old document tables
DROP TABLE IF EXISTS reading_documents CASCADE;
DROP TABLE IF EXISTS exam_files CASCADE;

-- Drop old conversation tables
DROP TABLE IF EXISTS search_conversations CASCADE;
DROP TABLE IF EXISTS search_messages CASCADE;
DROP TABLE IF EXISTS search_settings CASCADE;

-- Drop old exam-related tables
DROP TABLE IF EXISTS generated_exams CASCADE;
DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS exam_analytics CASCADE;
DROP TABLE IF EXISTS study_material_usage CASCADE;
DROP TABLE IF EXISTS exam_performance_metrics CASCADE;

-- Drop exam prep related tables (from your current schema)
DROP TABLE IF EXISTS exam_prep_documents CASCADE;
DROP TABLE IF EXISTS exam_prep_flashcard_progress CASCADE;
DROP TABLE IF EXISTS exam_prep_flashcards CASCADE;
DROP TABLE IF EXISTS exam_prep_processing_queue CASCADE;
DROP TABLE IF EXISTS exam_prep_questions CASCADE;
DROP TABLE IF EXISTS exam_prep_results CASCADE;
DROP TABLE IF EXISTS exam_prep_sessions CASCADE;
DROP TABLE IF EXISTS exam_prep_user_answers CASCADE;

-- Drop other miscellaneous tables
DROP TABLE IF EXISTS ai_model_logs CASCADE;
DROP TABLE IF EXISTS conversation_summaries CASCADE;
DROP TABLE IF EXISTS download_history CASCADE;
DROP TABLE IF EXISTS export_queue CASCADE;
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS user_content CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS version_control CASCADE;
DROP TABLE IF EXISTS writing_history CASCADE;

-- ===========================================
-- VERIFY CLEANUP
-- ===========================================

-- Check remaining tables
SELECT 'Cleanup Summary' as status,
       (SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_data', 'documents', 'conversations', 'messages', 'generated_content', 'sessions')) as consolidated_tables_count;

-- List all remaining tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

-- Cleanup completed successfully!
-- Your database now has only the 6 consolidated tables:
-- - user_data (all user info, subscriptions, usage)
-- - documents (all document types)
-- - conversations (all chat types)
-- - messages (all chat messages)
-- - generated_content (all AI-generated content)
-- - sessions (all user activity sessions)

-- Your database is now fully consolidated and optimized!
