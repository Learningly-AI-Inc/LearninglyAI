-- Increase Supabase Storage Bucket Size Limit
-- This script increases the file size limit for the exam-files bucket from 50MB to 100MB
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Check current bucket configuration
SELECT
  id,
  name,
  file_size_limit / 1024 / 1024 as "Current Limit (MB)",
  public,
  created_at
FROM storage.buckets
WHERE id = 'exam-files';

-- Update bucket file size limit to 100MB (104857600 bytes)
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB in bytes (100 * 1024 * 1024)
WHERE id = 'exam-files';

-- Verify the update
SELECT
  id,
  name,
  file_size_limit / 1024 / 1024 as "New Limit (MB)",
  public,
  updated_at
FROM storage.buckets
WHERE id = 'exam-files';

-- Optional: Update other buckets if they exist
-- UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'reading-documents';

-- IMPORTANT: After running this SQL, update your code limits in:
-- 1. components/exam-prep/study-materials-uploader.tsx (line 32)
-- 2. app/api/exam-prep/upload/route.ts (line 37)
-- Change both from 50 * 1024 * 1024 to 100 * 1024 * 1024
