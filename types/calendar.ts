export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  location?: string;
  event_type: 'general' | 'class' | 'exam' | 'assignment' | 'study' | 'deadline' | 'personal';
  course_code?: string;
  recurring_pattern?: RecurringPattern;
  created_at: string;
  updated_at: string;
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  days_of_week?: number[]; // 0-6 for Sunday-Saturday
  end_date?: string;
  count?: number; // Number of occurrences
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: 'google' | 'outlook' | 'apple' | 'other';
  external_calendar_id: string;
  calendar_name: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyllabusDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  semester_name: string;
  courses: Course[];
  processed_at: string;
  created_at: string;
}

export interface Course {
  name: string;
  code: string;
  instructor: string;
  schedule: CourseSchedule[];
  credits: number;
  location?: string;
  specific_sessions?: SpecificSession[];
}

export interface SpecificSession {
  date: string; // ISO date format
  title: string;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  location?: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar';
}

export interface CourseSchedule {
  day_of_week: number; // 0-6 for Sunday-Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  location?: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar';
}

export interface GeneratedSchedule {
  id: string;
  user_id: string;
  syllabus_document_id: string;
  semester_start_date: string;
  semester_end_date: string;
  schedule_data: ScheduleData;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleData {
  courses: Course[];
  events: GeneratedEvent[];
  semester_info: {
    name: string;
    start_date: string;
    end_date: string;
    holidays: Holiday[];
  };
}

export interface GeneratedEvent {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  location?: string;
  event_type: 'class' | 'exam' | 'assignment' | 'holiday' | 'break';
  course_code?: string;
  recurring_pattern?: RecurringPattern;
}

export interface Holiday {
  name: string;
  date: string;
  type: 'national' | 'academic' | 'religious';
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
}

export interface EventFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  location?: string;
  event_type: CalendarEvent['event_type'];
  course_code?: string;
  recurring_pattern?: RecurringPattern;
}

export interface VoiceCommand {
  action: 'create' | 'update' | 'delete' | 'move' | 'reschedule';
  event_title?: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  event_id?: string;
  new_time?: string;
  new_date?: string;
}
