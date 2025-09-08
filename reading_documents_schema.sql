-- Reading Documents Table: Stores uploaded documents for the reading feature
CREATE TABLE IF NOT EXISTS reading_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase storage path
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    extracted_text TEXT,
    page_count INTEGER DEFAULT 1,
    text_length INTEGER DEFAULT 0,
    processing_status TEXT CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    processing_notes TEXT[] DEFAULT '{}',
    public_url TEXT, -- Supabase public URL
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_documents_user_id ON reading_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_documents_status ON reading_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_reading_documents_created_at ON reading_documents(created_at);

-- Enable Row Level Security
ALTER TABLE reading_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reading documents" ON reading_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading documents" ON reading_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading documents" ON reading_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading documents" ON reading_documents
    FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for reading documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reading-documents',
    'reading-documents',
    false,
    20971520, -- 20MB limit
    ARRAY['application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for reading-documents bucket
CREATE POLICY "Allow authenticated users to upload reading documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reading-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to view their own reading documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'reading-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to update their own reading documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'reading-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to delete their own reading documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reading-documents' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
