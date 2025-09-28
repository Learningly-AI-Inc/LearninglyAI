-- Exam Prep Database Schema
-- This extends the existing schema to support full-length exam preparation functionality

-- Create storage bucket for exam files (Run this in Supabase dashboard or via SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exam-files', 'exam-files', true);

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

-- Exam Analytics Table: Stores detailed analytics for performance tracking
CREATE TABLE IF NOT EXISTS exam_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id)
    exam_id UUID REFERENCES generated_exams(id) ON DELETE CASCADE,
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL, -- Question identifier from exam_data
    question_topic TEXT,
    question_difficulty TEXT CHECK(question_difficulty IN ('easy', 'medium', 'hard')),
    user_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT, -- Time spent on this question
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Materials Usage: Track which files are used most frequently
CREATE TABLE IF NOT EXISTS study_material_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id)
    file_id UUID REFERENCES exam_files(id) ON DELETE CASCADE,
    usage_type TEXT CHECK(usage_type IN ('upload', 'exam_generation', 'view', 'download')) NOT NULL,
    exam_id UUID REFERENCES generated_exams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam Performance Metrics: Aggregated performance data
CREATE TABLE IF NOT EXISTS exam_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id)
    exam_id UUID REFERENCES generated_exams(id) ON DELETE CASCADE,
    avg_score DECIMAL(5,2),
    best_score DECIMAL(5,2),
    worst_score DECIMAL(5,2),
    total_attempts INT DEFAULT 0,
    avg_completion_time INT, -- Average time in seconds
    strong_topics TEXT[], -- Topics where user performs well
    weak_topics TEXT[], -- Topics where user needs improvement
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_files_user_id ON exam_files(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_files_upload_type ON exam_files(upload_type);
CREATE INDEX IF NOT EXISTS idx_generated_exams_user_id ON generated_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_id ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_analytics_user_id ON exam_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_analytics_session_id ON exam_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_study_material_usage_user_id ON study_material_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_performance_user_id ON exam_performance_metrics(user_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE exam_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for exam_files
CREATE POLICY "Users can view their own exam files" ON exam_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam files" ON exam_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam files" ON exam_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exam files" ON exam_files
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for generated_exams
CREATE POLICY "Users can view their own generated exams" ON generated_exams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated exams" ON generated_exams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated exams" ON generated_exams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated exams" ON generated_exams
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for exam_sessions
CREATE POLICY "Users can view their own exam sessions" ON exam_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam sessions" ON exam_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam sessions" ON exam_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for exam_analytics
CREATE POLICY "Users can view their own exam analytics" ON exam_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam analytics" ON exam_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for study_material_usage
CREATE POLICY "Users can view their own study material usage" ON study_material_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study material usage" ON study_material_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for exam_performance_metrics
CREATE POLICY "Users can view their own performance metrics" ON exam_performance_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics" ON exam_performance_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance metrics" ON exam_performance_metrics
    FOR UPDATE USING (auth.uid() = user_id);
