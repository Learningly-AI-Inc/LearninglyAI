-- Fix missing columns in documents table
-- Run this in your Supabase SQL Editor

-- Add missing columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS text_length INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_notes TEXT[] DEFAULT '{}';

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_documents_page_count ON documents(page_count);
CREATE INDEX IF NOT EXISTS idx_documents_text_length ON documents(text_length);

-- Update existing records to have default values
UPDATE documents 
SET 
  page_count = COALESCE(page_count, 1),
  text_length = COALESCE(text_length, 0),
  processing_notes = COALESCE(processing_notes, '{}')
WHERE page_count IS NULL OR text_length IS NULL OR processing_notes IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('page_count', 'text_length', 'processing_notes')
ORDER BY column_name;
