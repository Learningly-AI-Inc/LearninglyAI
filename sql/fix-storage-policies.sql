-- Fix Supabase Storage RLS Policies for exam-files bucket
-- Run this SQL in your Supabase SQL Editor

-- First, let's check if there are existing policies and remove them
DROP POLICY IF EXISTS "Users can upload exam files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their exam files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their exam files" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create new policies for the exam-files bucket
-- Policy 1: Allow users to upload files to their own folder
CREATE POLICY "Users can upload exam files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'exam-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow users to view files in their own folder
CREATE POLICY "Users can view their exam files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'exam-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow users to delete files in their own folder
CREATE POLICY "Users can delete their exam files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'exam-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow public read access to all files in exam-files bucket
-- This is needed because the bucket is marked as public
CREATE POLICY "Public read access for exam files" ON storage.objects
FOR SELECT USING (bucket_id = 'exam-files');

-- Alternative: If you want to be more restrictive, use this instead of the public policy above:
-- CREATE POLICY "Users can view their own exam files only" ON storage.objects
-- FOR SELECT USING (
--   bucket_id = 'exam-files' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
