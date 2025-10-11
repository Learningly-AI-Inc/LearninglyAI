-- Calendar Settings Table
CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_view VARCHAR(20) DEFAULT 'month' CHECK (default_view IN ('month', 'week', 'day', 'agenda')),
  week_start VARCHAR(10) DEFAULT 'sunday' CHECK (week_start IN ('sunday', 'monday')),
  time_format VARCHAR(10) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  timezone VARCHAR(50) DEFAULT 'UTC',
  default_event_duration INTEGER DEFAULT 60 CHECK (default_event_duration > 0),
  default_reminder_time INTEGER DEFAULT 15 CHECK (default_reminder_time >= 0),
  enable_notifications BOOLEAN DEFAULT TRUE,
  enable_email_reminders BOOLEAN DEFAULT TRUE,
  enable_sms_reminders BOOLEAN DEFAULT FALSE,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',
  working_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Monday to Friday
  theme VARCHAR(10) DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  event_colors JSONB DEFAULT '{}',
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_frequency INTEGER DEFAULT 15 CHECK (sync_frequency > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_settings_user_id ON calendar_settings(user_id);

-- RLS Policies
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- Calendar Settings Policies
CREATE POLICY "Users can view their own calendar settings" ON calendar_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar settings" ON calendar_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar settings" ON calendar_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar settings" ON calendar_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION update_calendar_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_calendar_settings_updated_at BEFORE UPDATE ON calendar_settings
  FOR EACH ROW EXECUTE FUNCTION update_calendar_settings_updated_at();
