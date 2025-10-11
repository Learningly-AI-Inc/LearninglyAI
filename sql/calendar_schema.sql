-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  location TEXT,
  event_type VARCHAR(50) DEFAULT 'general', -- general, class, exam, assignment, study, etc.
  course_id UUID, -- Reference to course if applicable
  recurring_pattern JSONB, -- For recurring events
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Integrations Table
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- google, outlook, apple, etc.
  external_calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, external_calendar_id)
);

-- Syllabus Documents Table
CREATE TABLE IF NOT EXISTS syllabus_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  semester_name TEXT NOT NULL,
  courses JSONB NOT NULL, -- Array of course objects with schedule info
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Schedules Table
CREATE TABLE IF NOT EXISTS generated_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  syllabus_document_id UUID REFERENCES syllabus_documents(id) ON DELETE CASCADE,
  semester_start_date DATE NOT NULL,
  semester_end_date DATE NOT NULL,
  schedule_data JSONB NOT NULL, -- Complete generated schedule
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_documents_user_id ON syllabus_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_user_id ON generated_schedules(user_id);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;

-- Calendar Events Policies
CREATE POLICY "Users can view their own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Calendar Integrations Policies
CREATE POLICY "Users can view their own calendar integrations" ON calendar_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integrations" ON calendar_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integrations" ON calendar_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar integrations" ON calendar_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Syllabus Documents Policies
CREATE POLICY "Users can view their own syllabus documents" ON syllabus_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own syllabus documents" ON syllabus_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own syllabus documents" ON syllabus_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own syllabus documents" ON syllabus_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Generated Schedules Policies
CREATE POLICY "Users can view their own generated schedules" ON generated_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated schedules" ON generated_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated schedules" ON generated_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated schedules" ON generated_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_syllabus_documents_updated_at BEFORE UPDATE ON syllabus_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_schedules_updated_at BEFORE UPDATE ON generated_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
