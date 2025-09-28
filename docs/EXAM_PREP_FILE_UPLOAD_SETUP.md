# Exam Prep File Upload System Setup Guide

## Overview
This guide walks you through setting up the complete file upload system for the exam prep feature, including Supabase Storage configuration, database schema updates, and security policies.

## Prerequisites
- Active Supabase project
- Admin access to Supabase dashboard
- Environment variables already configured for Supabase

## Step 1: Supabase Storage Setup

### 1.1 Create Storage Bucket
1. Go to your Supabase dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **Create Bucket**
4. Configure the bucket:
   - **Name**: `exam-prep-documents`
   - **Public**: `false` (private bucket for security)
   - **File size limit**: `50MB` (adjustable based on needs)
   - **Allowed MIME types**: 
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/msword`
     - `text/plain`
     - `application/vnd.openxmlformats-officedocument.presentationml.presentation`

### 1.2 Create Additional Buckets (Optional)
Create these buckets for organized file management:
- `exam-prep-thumbnails` (for document previews)
- `exam-prep-temp` (for temporary uploads during processing)

## Step 2: Database Schema Updates

### 2.1 Run Database Migrations
Execute the following SQL in your Supabase SQL Editor:

```sql
-- Create exam prep documents table
CREATE TABLE IF NOT EXISTS exam_prep_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase storage path
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    extracted_text TEXT,
    processing_status TEXT CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create context selections table for study sessions
CREATE TABLE IF NOT EXISTS exam_prep_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- Links to study session
    document_ids UUID[] NOT NULL, -- Array of selected documents
    context_summary TEXT,
    session_type TEXT CHECK(session_type IN ('quiz', 'flashcards', 'meme')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file processing queue table
CREATE TABLE IF NOT EXISTS exam_prep_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES exam_prep_documents(id) ON DELETE CASCADE,
    processing_type TEXT CHECK(processing_type IN ('text_extraction', 'thumbnail_generation', 'content_analysis')) NOT NULL,
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_prep_documents_user_id ON exam_prep_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_prep_documents_status ON exam_prep_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_exam_prep_contexts_user_id ON exam_prep_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_prep_contexts_session_id ON exam_prep_contexts(session_id);

-- Add updated_at trigger for exam_prep_documents
CREATE OR REPLACE FUNCTION update_exam_prep_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_prep_documents_updated_at
    BEFORE UPDATE ON exam_prep_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_prep_documents_updated_at();
```

### 2.2 Enable Row Level Security (RLS)
Execute the following to enable security policies:

```sql
-- Enable RLS on tables
ALTER TABLE exam_prep_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_prep_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_prep_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exam_prep_documents
CREATE POLICY "Users can view their own documents" ON exam_prep_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON exam_prep_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON exam_prep_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON exam_prep_documents
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for exam_prep_contexts
CREATE POLICY "Users can view their own contexts" ON exam_prep_contexts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contexts" ON exam_prep_contexts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contexts" ON exam_prep_contexts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contexts" ON exam_prep_contexts
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for processing queue (more permissive for system operations)
CREATE POLICY "Users can view processing status for their documents" ON exam_prep_processing_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_prep_documents 
            WHERE id = document_id AND user_id = auth.uid()
        )
    );
```

## Step 3: Storage Policies Setup

### 3.1 Configure Storage Policies
In Supabase Dashboard → Storage → Policies, create these policies for `exam-prep-documents` bucket:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'exam-prep-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to view their own files
CREATE POLICY "Allow users to view own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'exam-prep-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to update their own files
CREATE POLICY "Allow users to update own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'exam-prep-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'exam-prep-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
```

### 3.2 Storage Policy for Thumbnails (if using thumbnail bucket)
```sql
-- Policies for exam-prep-thumbnails bucket
CREATE POLICY "Allow thumbnail uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'exam-prep-thumbnails' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to view own thumbnails" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'exam-prep-thumbnails' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
```

## Step 4: Environment Variables

### 4.1 Verify Environment Variables
Ensure these variables are set in your `.env.local`:

```env
# Supabase Configuration (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# File Upload Configuration (add these new ones)
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB in bytes
NEXT_PUBLIC_ALLOWED_FILE_TYPES=pdf,docx,doc,txt,ppt,pptx
NEXT_PUBLIC_STORAGE_BUCKET=exam-prep-documents
```

## Step 5: Install Required Dependencies

### 5.1 Install New NPM Packages
Run these commands in your project root:

```bash
# File processing and upload dependencies
npm install @supabase/storage-js
npm install react-dropzone
npm install file-type
npm install pdf-parse
npm install mammoth  # for DOCX processing
npm install @types/pdf-parse

# Additional utilities for file handling
npm install mime-types
npm install @types/mime-types
```

## Step 6: File Processing Setup

### 6.1 Create File Processing Utilities Directory
The implementation will create these utility files:
- `lib/file-processing/text-extractor.ts` - Extract text from various file types
- `lib/file-processing/file-validator.ts` - Validate file types and sizes
- `lib/storage/supabase-storage.ts` - Supabase storage operations wrapper
- `lib/exam-prep/document-manager.ts` - Document management business logic

## Step 7: Security Considerations

### 7.1 File Validation
- File type validation (MIME type + extension)
- File size limits (50MB default)
- Virus scanning (consider integrating ClamAV or similar)
- Content scanning for inappropriate material

### 7.2 Access Control
- Files are stored in user-specific folders (`userId/filename`)
- RLS policies ensure users can only access their own files
- Signed URLs for temporary file access when needed

### 7.3 Rate Limiting
Consider implementing rate limiting for:
- File uploads (e.g., 10 files per minute)
- Storage usage (e.g., 1GB per user)
- Processing requests

## Step 8: Testing Checklist

Before proceeding with implementation, verify:

- [ ] Storage bucket `exam-prep-documents` created
- [ ] Database tables created successfully
- [ ] RLS policies applied and working
- [ ] Storage policies configured
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Supabase connection working

## Step 9: Monitoring Setup

### 9.1 Database Functions for Monitoring
```sql
-- Function to get user storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS TABLE(
    total_files INTEGER,
    total_size BIGINT,
    processing_count INTEGER,
    failed_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_files,
        COALESCE(SUM(file_size), 0)::BIGINT as total_size,
        COUNT(CASE WHEN processing_status = 'processing' THEN 1 END)::INTEGER as processing_count,
        COUNT(CASE WHEN processing_status = 'failed' THEN 1 END)::INTEGER as failed_count
    FROM exam_prep_documents 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Verification Steps

After completing all setup steps:

1. **Test Database Access**: Run a simple query to verify tables exist
2. **Test Storage Access**: Try creating a test file upload
3. **Test Policies**: Verify RLS is working with a test user
4. **Test File Processing**: Upload a sample PDF and verify text extraction

## Common Issues and Solutions

### Issue: Storage bucket not accessible
**Solution**: Check storage policies and ensure bucket is created in correct project

### Issue: RLS policies blocking access
**Solution**: Verify user authentication and policy conditions

### Issue: File upload fails
**Solution**: Check file size limits and MIME type restrictions

### Issue: Text extraction not working
**Solution**: Verify PDF processing dependencies are installed

## Next Steps

Once setup is complete:
1. Confirm all verification steps pass
2. Notify that setup is ready for implementation
3. Begin development of file upload components and integration

---

**Important Notes:**
- Always test in development environment first
- Backup your database before running migrations
- Monitor storage usage and costs
- Keep sensitive keys secure and never commit to version control

**Support:**
- Supabase Documentation: https://supabase.com/docs
- Storage API Reference: https://supabase.com/docs/reference/javascript/storage
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security


