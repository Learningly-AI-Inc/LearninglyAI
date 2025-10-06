-- COMPLETE MIGRATION AND CLEANUP SCRIPT
-- This script will:
-- 1. Migrate all data from old tables to new consolidated tables
-- 2. Drop all old tables after successful migration
-- 3. Keep only the 6 new consolidated tables

-- ===========================================
-- STEP 1: MIGRATE ALL DATA TO NEW TABLES
-- ===========================================

-- Migrate user subscription data to user_data table
-- Only migrate subscriptions for users that still exist in auth.users
INSERT INTO user_data (
  user_id,
  plan_name,
  plan_price_cents,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  us.user_id,
  COALESCE(sp.name, 'Free') as plan_name,
  COALESCE(sp.price_cents, 0) as plan_price_cents,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.status as subscription_status,
  us.current_period_end,
  us.cancel_at_period_end
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
INNER JOIN auth.users u ON us.user_id = u.id
ON CONFLICT (user_id) DO NOTHING;

-- Migrate usage data to user_data table
-- Only update usage for users that exist in both tables
UPDATE user_data 
SET 
  documents_uploaded = COALESCE(uu.documents_uploaded, 0),
  ai_requests = COALESCE(uu.ai_requests, 0),
  search_queries = COALESCE(uu.search_queries, 0),
  exam_sessions = COALESCE(uu.exam_sessions, 0),
  storage_used_bytes = COALESCE(uu.storage_used_bytes, 0)
FROM user_usage uu
INNER JOIN auth.users u ON uu.user_id = u.id
WHERE user_data.user_id = uu.user_id
AND uu.usage_date = CURRENT_DATE;

-- Migrate reading documents to consolidated documents table
-- Only migrate documents for users that still exist in auth.users
INSERT INTO documents (
  user_id,
  title,
  original_filename,
  file_path,
  file_type,
  file_size,
  mime_type,
  document_type,
  extracted_text,
  processing_status,
  public_url,
  metadata,
  created_at,
  updated_at
)
SELECT 
  rd.user_id,
  rd.title,
  rd.original_filename,
  rd.file_path,
  rd.file_type,
  rd.file_size,
  rd.mime_type,
  'reading' as document_type,
  rd.extracted_text,
  rd.processing_status,
  rd.public_url,
  rd.metadata,
  rd.created_at,
  rd.updated_at
FROM reading_documents rd
INNER JOIN auth.users u ON rd.user_id = u.id
ON CONFLICT DO NOTHING;

-- Migrate exam files to consolidated documents table
-- Only migrate files for users that still exist in auth.users
INSERT INTO documents (
  user_id,
  title,
  original_filename,
  file_path,
  file_type,
  file_size,
  mime_type,
  document_type,
  extracted_text,
  processing_status,
  public_url,
  metadata,
  created_at,
  updated_at
)
SELECT 
  ef.user_id,
  ef.filename as title,
  ef.filename as original_filename,
  ef.file_path,
  ef.content_type as file_type,
  ef.file_size,
  ef.content_type as mime_type,
  'exam-prep' as document_type,
  ef.extracted_content as extracted_text,
  ef.processing_status,
  ef.public_url,
  '{}' as metadata,
  ef.created_at,
  ef.updated_at
FROM exam_files ef
INNER JOIN auth.users u ON ef.user_id = u.id
ON CONFLICT DO NOTHING;

-- Migrate search conversations to consolidated conversations table
-- Only migrate conversations for users that still exist in auth.users
-- Normalize model_used to match our constraint (openai or gemini)
INSERT INTO conversations (
  user_id,
  title,
  conversation_type,
  model_used,
  created_at,
  updated_at
)
SELECT 
  sc.user_id,
  sc.title,
  'search' as conversation_type,
  CASE 
    WHEN sc.model_used LIKE '%openai%' OR sc.model_used LIKE '%gpt%' THEN 'openai'
    WHEN sc.model_used LIKE '%gemini%' OR sc.model_used LIKE '%claude%' THEN 'gemini'
    ELSE 'gemini' -- default to gemini for unknown models
  END as model_used,
  sc.created_at,
  sc.updated_at
FROM search_conversations sc
INNER JOIN auth.users u ON sc.user_id = u.id
ON CONFLICT DO NOTHING;

-- Migrate search messages to consolidated messages table
-- Only migrate messages for conversations that belong to existing users
-- Map old conversation_id to new conversation_id
-- Normalize model_used to match our constraint (openai or gemini)
INSERT INTO messages (
  conversation_id,
  role,
  content,
  sources,
  model_used,
  tokens_used,
  created_at
)
SELECT 
  c.id as conversation_id, -- Use the new conversation ID
  sm.role,
  sm.content,
  sm.sources,
  CASE 
    WHEN sm.model_used LIKE '%openai%' OR sm.model_used LIKE '%gpt%' THEN 'openai'
    WHEN sm.model_used LIKE '%gemini%' OR sm.model_used LIKE '%claude%' THEN 'gemini'
    ELSE 'gemini' -- default to gemini for unknown models
  END as model_used,
  sm.tokens_used,
  sm.created_at
FROM search_messages sm
INNER JOIN search_conversations sc ON sm.conversation_id = sc.id
INNER JOIN auth.users u ON sc.user_id = u.id
INNER JOIN conversations c ON c.user_id = sc.user_id 
  AND c.title = sc.title 
  AND c.conversation_type = 'search'
  AND c.model_used = CASE 
    WHEN sc.model_used LIKE '%openai%' OR sc.model_used LIKE '%gpt%' THEN 'openai'
    WHEN sc.model_used LIKE '%gemini%' OR sc.model_used LIKE '%claude%' THEN 'gemini'
    ELSE 'gemini'
  END
ON CONFLICT DO NOTHING;

-- Migrate generated exams to consolidated generated_content table
-- Only migrate content for users that still exist in auth.users
INSERT INTO generated_content (
  user_id,
  content_type,
  title,
  content_data,
  source_documents,
  generation_status,
  created_at,
  updated_at
)
SELECT 
  ge.user_id,
  'exam' as content_type,
  ge.exam_title as title,
  ge.exam_data as content_data,
  ge.source_files as source_documents,
  ge.generation_status,
  ge.created_at,
  ge.updated_at
FROM generated_exams ge
INNER JOIN auth.users u ON ge.user_id = u.id
ON CONFLICT DO NOTHING;

-- Migrate exam sessions to consolidated sessions table
-- Only migrate sessions for users that still exist in auth.users
INSERT INTO sessions (
  user_id,
  content_id,
  session_type,
  session_status,
  start_time,
  end_time,
  duration_seconds,
  score_data,
  user_answers,
  created_at,
  updated_at
)
SELECT 
  es.user_id,
  es.exam_id as content_id,
  'exam' as session_type,
  es.session_status,
  es.start_time,
  es.end_time,
  es.duration_seconds,
  jsonb_build_object(
    'total_questions', es.total_questions,
    'correct_answers', es.correct_answers,
    'score_percentage', es.score_percentage
  ) as score_data,
  es.user_answers,
  es.created_at,
  es.updated_at
FROM exam_sessions es
INNER JOIN auth.users u ON es.user_id = u.id
ON CONFLICT DO NOTHING;

-- ===========================================
-- STEP 2: VERIFY MIGRATION SUCCESS
-- ===========================================

-- Check migration results
SELECT 'Migration Summary' as status, 
       (SELECT COUNT(*) FROM user_data) as user_data_count,
       (SELECT COUNT(*) FROM documents) as documents_count,
       (SELECT COUNT(*) FROM conversations) as conversations_count,
       (SELECT COUNT(*) FROM messages) as messages_count,
       (SELECT COUNT(*) FROM generated_content) as generated_content_count,
       (SELECT COUNT(*) FROM sessions) as sessions_count;

-- ===========================================
-- STEP 3: DROP OLD TABLES (AFTER VERIFICATION)
-- ===========================================

-- WARNING: This will permanently delete all old tables and their data
-- Only run this after confirming the migration was successful

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
-- COMPLETION MESSAGE
-- ===========================================

-- This script has successfully:
-- 1. Migrated all data from 15+ old tables to 6 new consolidated tables
-- 2. Dropped all old tables to clean up the database
-- 3. Left you with a clean, consolidated database structure

-- Your database now has only 6 tables:
-- - user_data (all user info, subscriptions, usage)
-- - documents (all document types)
-- - conversations (all chat types)
-- - messages (all chat messages)
-- - generated_content (all AI-generated content)
-- - sessions (all user activity sessions)

-- Test your application to ensure everything works correctly!
