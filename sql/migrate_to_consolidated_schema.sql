-- Migration script to consolidate multiple tables into fewer, more manageable tables
-- Run this AFTER creating the new consolidated schema

-- Step 1: Migrate user subscription data to user_data table
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
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Migrate usage data to user_data table
UPDATE user_data 
SET 
  documents_uploaded = COALESCE(uu.documents_uploaded, 0),
  ai_requests = COALESCE(uu.ai_requests, 0),
  search_queries = COALESCE(uu.search_queries, 0),
  exam_sessions = COALESCE(uu.exam_sessions, 0),
  storage_used_bytes = COALESCE(uu.storage_used_bytes, 0)
FROM user_usage uu
WHERE user_data.user_id = uu.user_id
AND uu.usage_date = CURRENT_DATE;

-- Step 3: Migrate reading documents to consolidated documents table
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
ON CONFLICT DO NOTHING;

-- Step 4: Migrate exam files to consolidated documents table
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
ON CONFLICT DO NOTHING;

-- Step 5: Migrate search conversations to consolidated conversations table
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
  sc.model_used,
  sc.created_at,
  sc.updated_at
FROM search_conversations sc
ON CONFLICT DO NOTHING;

-- Step 6: Migrate search messages to consolidated messages table
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
  sm.conversation_id,
  sm.role,
  sm.content,
  sm.sources,
  sm.model_used,
  sm.tokens_used,
  sm.created_at
FROM search_messages sm
ON CONFLICT DO NOTHING;

-- Step 7: Migrate generated exams to consolidated generated_content table
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
ON CONFLICT DO NOTHING;

-- Step 8: Migrate exam sessions to consolidated sessions table
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
ON CONFLICT DO NOTHING;

-- Step 9: Clean up old tables (optional - comment out if you want to keep them for backup)
-- DROP TABLE IF EXISTS user_subscriptions CASCADE;
-- DROP TABLE IF EXISTS user_usage CASCADE;
-- DROP TABLE IF EXISTS payment_history CASCADE;
-- DROP TABLE IF EXISTS subscription_plans CASCADE;
-- DROP TABLE IF EXISTS reading_documents CASCADE;
-- DROP TABLE IF EXISTS exam_files CASCADE;
-- DROP TABLE IF EXISTS search_conversations CASCADE;
-- DROP TABLE IF EXISTS search_messages CASCADE;
-- DROP TABLE IF EXISTS search_settings CASCADE;
-- DROP TABLE IF EXISTS generated_exams CASCADE;
-- DROP TABLE IF EXISTS exam_sessions CASCADE;
-- DROP TABLE IF EXISTS exam_analytics CASCADE;
-- DROP TABLE IF EXISTS study_material_usage CASCADE;
-- DROP TABLE IF EXISTS exam_performance_metrics CASCADE;
