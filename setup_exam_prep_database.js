/**
 * Setup script for Exam Prep database tables
 * Run this script to create all necessary tables and policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const examPrepSchema = `
-- Exam Files Table: Stores uploaded PDF files for exam preparation
CREATE TABLE IF NOT EXISTS exam_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id) 
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase storage
    file_size INT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/pdf',
    upload_type TEXT NOT NULL DEFAULT 'exam-prep',
    public_url TEXT NOT NULL,
    processing_status TEXT CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    extracted_content TEXT, -- PDF text content after processing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Exams Table: Stores AI-generated exams
CREATE TABLE IF NOT EXISTS generated_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id)
    exam_title TEXT NOT NULL,
    exam_config JSONB NOT NULL, -- Stores ExamConfig: {numMCQ, examDuration, difficulty, etc.}
    exam_data JSONB NOT NULL, -- Stores the complete exam: {questions, instructions, etc.}
    source_files TEXT[] NOT NULL, -- Array of source file names
    content_hash TEXT, -- Hash of source content for deduplication
    generation_status TEXT CHECK(generation_status IN ('pending', 'generating', 'completed', 'failed')) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam Sessions Table: Tracks exam attempts and scores
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id)
    exam_id UUID REFERENCES generated_exams(id) ON DELETE CASCADE,
    session_status TEXT CHECK(session_status IN ('started', 'in_progress', 'completed', 'abandoned')) DEFAULT 'started',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INT, -- Actual time taken
    total_questions INT NOT NULL,
    correct_answers INT DEFAULT 0,
    score_percentage DECIMAL(5,2) DEFAULT 0,
    user_answers JSONB, -- Stores all user answers and timings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_files_user_id ON exam_files(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_files_upload_type ON exam_files(upload_type);
CREATE INDEX IF NOT EXISTS idx_generated_exams_user_id ON generated_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_id ON exam_sessions(exam_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE exam_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for exam_files
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own exam files" ON exam_files;
    CREATE POLICY "Users can view their own exam files" ON exam_files
        FOR SELECT USING (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can insert their own exam files" ON exam_files;
    CREATE POLICY "Users can insert their own exam files" ON exam_files
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can update their own exam files" ON exam_files;
    CREATE POLICY "Users can update their own exam files" ON exam_files
        FOR UPDATE USING (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can delete their own exam files" ON exam_files;
    CREATE POLICY "Users can delete their own exam files" ON exam_files
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Policies for generated_exams
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own generated exams" ON generated_exams;
    CREATE POLICY "Users can view their own generated exams" ON generated_exams
        FOR SELECT USING (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can insert their own generated exams" ON generated_exams;
    CREATE POLICY "Users can insert their own generated exams" ON generated_exams
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can update their own generated exams" ON generated_exams;
    CREATE POLICY "Users can update their own generated exams" ON generated_exams
        FOR UPDATE USING (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can delete their own generated exams" ON generated_exams;
    CREATE POLICY "Users can delete their own generated exams" ON generated_exams
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Policies for exam_sessions
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own exam sessions" ON exam_sessions;
    CREATE POLICY "Users can view their own exam sessions" ON exam_sessions
        FOR SELECT USING (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can insert their own exam sessions" ON exam_sessions;
    CREATE POLICY "Users can insert their own exam sessions" ON exam_sessions
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
    DROP POLICY IF EXISTS "Users can update their own exam sessions" ON exam_sessions;
    CREATE POLICY "Users can update their own exam sessions" ON exam_sessions
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;
`;

const createStorageBucket = `
-- Create storage bucket and policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exam-files', 'exam-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can upload exam files" ON storage.objects;
    CREATE POLICY "Users can upload exam files" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'exam-files' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

    DROP POLICY IF EXISTS "Users can view their exam files" ON storage.objects;
    CREATE POLICY "Users can view their exam files" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'exam-files' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

    DROP POLICY IF EXISTS "Users can delete their exam files" ON storage.objects;
    CREATE POLICY "Users can delete their exam files" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'exam-files' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;
`;

async function setupDatabase() {
  console.log('🚀 Setting up Exam Prep database...');
  
  try {
    // Create tables and policies
    console.log('📋 Creating tables and policies...');
    const { error: schemaError } = await supabase.rpc('exec', { 
      sql: examPrepSchema 
    });
    
    if (schemaError) {
      console.error('Schema error:', schemaError);
    } else {
      console.log('✅ Tables and policies created successfully');
    }

    // Create storage bucket and policies
    console.log('🗂️  Creating storage bucket...');
    const { error: storageError } = await supabase.rpc('exec', { 
      sql: createStorageBucket 
    });
    
    if (storageError) {
      console.error('Storage error:', storageError);
    } else {
      console.log('✅ Storage bucket created successfully');
    }

    console.log('🎉 Exam Prep database setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Alternative approach using direct SQL execution
async function setupDatabaseDirect() {
  console.log('🚀 Setting up Exam Prep database (direct SQL)...');
  
  try {
    // Split schema into individual statements
    const statements = examPrepSchema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.query(statement);
        if (error) {
          console.error('SQL Error:', error);
        }
      }
    }
    
    console.log('✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase().then(() => {
    console.log('Setup script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Setup script failed:', error);
    process.exit(1);
  });
}

module.exports = { setupDatabase, setupDatabaseDirect };
