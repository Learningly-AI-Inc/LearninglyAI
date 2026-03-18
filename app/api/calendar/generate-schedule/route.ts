import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CalendarEvent {
  title: string
  description: string
  start_time: string
  end_time: string
  all_day: boolean
  color: string
  location?: string
  event_type: string
  course_code: string
  recurring_pattern?: {
    type: string
    interval: number
    days_of_week: number[]
    end_date: string
  }
}

interface Course {
  name: string
  code: string
  schedule: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    type: string
    location?: string
  }>
  specific_sessions?: Array<{
    date: string // ISO date
    title: string
    start_time: string
    end_time: string
    location?: string
    type: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { syllabus_document_id, semester_name, semester_start_date, semester_end_date, courses } = await request.json()

    if (!syllabus_document_id || !semester_name || !courses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use provided dates if available, otherwise calculate based on semester name
    let semesterStartDate: Date
    let semesterEndDate: Date

    if (semester_start_date && semester_end_date) {
      // Use provided dates
      semesterStartDate = new Date(semester_start_date)
      semesterEndDate = new Date(semester_end_date)
    } else {
      // Fallback: Calculate semester dates based on semester name
      const currentYear = new Date().getFullYear()
      
      // Extract year from semester name (support 20xx format)
      const yearMatch = semester_name.match(/\b(20\d{2})\b/)
      const extractedYear = yearMatch ? parseInt(yearMatch[0]) : currentYear
      
      if (semester_name.toLowerCase().includes('spring')) {
        semesterStartDate = new Date(`${extractedYear}-01-15`)
        semesterEndDate = new Date(`${extractedYear}-05-15`)
      } else if (semester_name.toLowerCase().includes('fall')) {
        semesterStartDate = new Date(`${extractedYear}-08-26`)
        semesterEndDate = new Date(`${extractedYear}-12-13`)
      } else if (semester_name.toLowerCase().includes('summer')) {
        semesterStartDate = new Date(`${extractedYear}-05-15`)
        semesterEndDate = new Date(`${extractedYear}-08-15`)
      } else {
        // Default to current semester based on current date
        const now = new Date()
        const month = now.getMonth() + 1
        if (month >= 1 && month <= 5) {
          semesterStartDate = new Date(`${extractedYear}-01-15`)
          semesterEndDate = new Date(`${extractedYear}-05-15`)
        } else if (month >= 8 && month <= 12) {
          semesterStartDate = new Date(`${extractedYear}-08-26`)
          semesterEndDate = new Date(`${extractedYear}-12-13`)
        } else {
          semesterStartDate = new Date(`${extractedYear}-05-15`)
          semesterEndDate = new Date(`${extractedYear}-08-15`)
        }
      }
    }
    
    console.log(`Generating schedule for ${semester_name}: ${semesterStartDate.toISOString().split('T')[0]} to ${semesterEndDate.toISOString().split('T')[0]}`)

    // Generate events for each course
    const events: CalendarEvent[] = []
    
    // Generate holidays based on semester
    const holidays = []
    const semesterYear = semesterStartDate.getFullYear()
    
    if (semester_name.toLowerCase().includes('spring')) {
      // Spring holidays
      holidays.push(
        { name: "Martin Luther King Jr. Day", date: `${semesterYear}-01-20`, type: "national" },
        { name: "Presidents' Day", date: `${semesterYear}-02-17`, type: "national" },
        { name: "Spring Break", date: `${semesterYear}-03-17`, type: "academic" },
        { name: "Memorial Day", date: `${semesterYear}-05-26`, type: "national" }
      )
    } else if (semester_name.toLowerCase().includes('fall')) {
      // Fall holidays
      holidays.push(
        { name: "Labor Day", date: `${semesterYear}-09-02`, type: "national" },
        { name: "Thanksgiving Break", date: `${semesterYear}-11-28`, type: "academic" },
        { name: "Thanksgiving Break", date: `${semesterYear}-11-29`, type: "academic" }
      )
    }

    // Generate class events
    courses.forEach((course: Course) => {
      // If course has specific_sessions, use those instead of generating recurring events
      if (course.specific_sessions && course.specific_sessions.length > 0) {
        console.log(`Using specific sessions for ${course.code}:`, course.specific_sessions.length, 'sessions')

        course.specific_sessions.forEach((session) => {
          // Skip only exams and assignments, include lectures and general events
          const sessionType = session.type?.toLowerCase() || 'lecture'
          if (sessionType === 'exam' || sessionType === 'final' || sessionType === 'assignment' || sessionType === 'quiz') {
            console.log(`Skipping ${sessionType} session:`, session.title)
            return // Skip exam/assignment sessions
          }

          // Validate required fields
          if (!session.date || !session.start_time || !session.end_time) {
            console.warn('Skipping session with missing required fields:', session)
            return
          }

          console.log(`Including session: ${session.title} (type: ${sessionType})`)

          // Parse date correctly to avoid timezone issues
          // session.date is in format "YYYY-MM-DD"
          const [year, month, day] = session.date.split('-').map(Number)
          const [hours, minutes] = session.start_time.split(':').map(Number)
          const [endHours, endMinutes] = session.end_time.split(':').map(Number)

          // Create dates in local timezone, then format as ISO string without timezone conversion
          const startTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
          const endTime = new Date(year, month - 1, day, endHours, endMinutes, 0, 0)

          // Format as YYYY-MM-DDTHH:mm:ss without timezone conversion
          const formatLocalISO = (date: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0')
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
          }

          events.push({
            title: `${course.name}: ${session.title}`,
            description: `${course.code} - ${session.title}`,
            start_time: formatLocalISO(startTime),
            end_time: formatLocalISO(endTime),
            all_day: false,
            color: getEventColor(session.type),
            location: session.location || course.schedule[0]?.location,
            event_type: 'class',
            course_code: course.code
          })
        })
      } else {
        // Fall back to recurring events if no specific sessions
        course.schedule.forEach((schedule) => {
          // Include all class-related sessions (lectures, labs, tutorials), skip only exams/assignments
          const scheduleType = schedule.type?.toLowerCase() || 'lecture'
          if (scheduleType === 'exam' || scheduleType === 'final' || scheduleType === 'assignment' || scheduleType === 'quiz') {
            console.log(`Skipping ${scheduleType} schedule`)
            return // Skip exam/assignment schedules
          }

          // Validate required fields
          if (!schedule.start_time || !schedule.end_time || schedule.day_of_week === undefined) {
            console.warn('Skipping schedule with missing required fields:', schedule)
            return
          }

          console.log(`Including recurring schedule: ${course.name} on day ${schedule.day_of_week} (type: ${scheduleType})`)

          const startDate = new Date(semesterStartDate)
          const endDate = new Date(semesterEndDate)

          // Find the first occurrence of the day of week
          const dayOffset = (schedule.day_of_week - startDate.getDay() + 7) % 7
          startDate.setDate(startDate.getDate() + dayOffset)

          // Format as YYYY-MM-DDTHH:mm:ss without timezone conversion
          const formatLocalISO = (date: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0')
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
          }

          // Create a single recurring event instead of multiple individual events
          const eventDate = new Date(startDate)
          const startTime = new Date(eventDate)
          const [hours, minutes] = schedule.start_time.split(':')
          startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

          const endTime = new Date(eventDate)
          const [endHours, endMinutes] = schedule.end_time.split(':')
          endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0)

          events.push({
            title: course.name,
            description: `${course.code} - ${schedule.type}`,
            start_time: formatLocalISO(startTime),
            end_time: formatLocalISO(endTime),
            all_day: false,
            color: getEventColor(schedule.type),
            location: schedule.location,
            event_type: 'class',
            course_code: course.code,
            recurring_pattern: {
              type: 'weekly',
              interval: 1,
              days_of_week: [schedule.day_of_week],
              end_date: semesterEndDate.toISOString()
            }
          })
        })
      }
    })

    // Only generate lecture events - no exams, assignments, or other non-lecture events

    const scheduleData = {
      courses,
      events,
      semester_info: {
        name: semester_name,
        start_date: semesterStartDate.toISOString(),
        end_date: semesterEndDate.toISOString(),
        holidays
      }
    }

    return NextResponse.json({
      semester_start_date: semesterStartDate.toISOString().split('T')[0],
      semester_end_date: semesterEndDate.toISOString().split('T')[0],
      ...scheduleData
    })

  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}

function getEventColor(eventType: string): string {
  const colorMap: { [key: string]: string } = {
    'lecture': '#3B82F6',
    'lab': '#10B981',
    'tutorial': '#8B5CF6',
    'seminar': '#F59E0B'
  }
  return colorMap[eventType] || '#6B7280'
}
