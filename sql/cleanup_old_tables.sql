-- CLEANUP OLD TABLES SCRIPT
-- WARNING: This will permanently delete all old tables and their data
-- Only run this AFTER confirming the migration was successful and your application works

-- ===========================================
-- DROP OLD TABLES
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

-- ===========================================
-- VERIFY CLEANUP
-- ===========================================

-- Check remaining tables
SELECT 'Cleanup Summary' as status,
       (SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_data', 'documents', 'conversations', 'messages', 'generated_content', 'sessions')) as consolidated_tables_count;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

-- Cleanup completed successfully!
-- Your database now has only 6 consolidated tables:
-- - user_data (all user info, subscriptions, usage)
-- - documents (all document types)
-- - conversations (all chat types)
-- - messages (all chat messages)
-- - generated_content (all AI-generated content)
-- - sessions (all user activity sessions)

-- Your database is now fully consolidated and optimized!
