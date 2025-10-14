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
      
      if (semester_name.toLowerCase().includes('spring')) {
        const year = semester_name.match(/202\d/) ? parseInt(semester_name.match(/202\d/)![0]) : currentYear
        semesterStartDate = new Date(`${year}-01-15`)
        semesterEndDate = new Date(`${year}-05-15`)
      } else if (semester_name.toLowerCase().includes('fall')) {
        const year = semester_name.match(/202\d/) ? parseInt(semester_name.match(/202\d/)![0]) : currentYear
        semesterStartDate = new Date(`${year}-08-26`)
        semesterEndDate = new Date(`${year}-12-13`)
      } else if (semester_name.toLowerCase().includes('summer')) {
        const year = semester_name.match(/202\d/) ? parseInt(semester_name.match(/202\d/)![0]) : currentYear
        semesterStartDate = new Date(`${year}-05-15`)
        semesterEndDate = new Date(`${year}-08-15`)
      } else {
        // Default to current semester
        const now = new Date()
        const month = now.getMonth() + 1
        if (month >= 1 && month <= 5) {
          semesterStartDate = new Date(`${currentYear}-01-15`)
          semesterEndDate = new Date(`${currentYear}-05-15`)
        } else if (month >= 8 && month <= 12) {
          semesterStartDate = new Date(`${currentYear}-08-26`)
          semesterEndDate = new Date(`${currentYear}-12-13`)
        } else {
          semesterStartDate = new Date(`${currentYear}-05-15`)
          semesterEndDate = new Date(`${currentYear}-08-15`)
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

          // Generate recurring events for the semester
          while (startDate <= endDate) {
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
              event_type: schedule.type === 'lab' ? 'study' : 'class',
              course_code: course.code,
              recurring_pattern: {
                type: 'weekly',
                interval: 1,
                days_of_week: [schedule.day_of_week],
                end_date: semesterEndDate.toISOString()
              }
            })

            // Move to next week
            startDate.setDate(startDate.getDate() + 7)
          }
        })
      }
    })

    // Helper function to format dates without timezone conversion
    const formatLocalISO = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    // Add exam periods (midterm and final)
    const midtermWeek = new Date(semesterStartDate)
    midtermWeek.setDate(midtermWeek.getDate() + 42) // ~6 weeks into semester

    const finalWeek = new Date(semesterEndDate)
    finalWeek.setDate(finalWeek.getDate() - 7) // Week before finals

    courses.forEach((course: Course) => {
      // Midterm exam
      const midtermDate = new Date(midtermWeek)
      midtermDate.setDate(midtermDate.getDate() + (course.schedule[0]?.day_of_week || 1))
      midtermDate.setHours(9, 0, 0, 0) // 9 AM

      const midtermEnd = new Date(midtermDate)
      midtermEnd.setHours(11, 0, 0, 0) // 11 AM

      events.push({
        title: `${course.name} - Midterm Exam`,
        description: `Midterm exam for ${course.code}`,
        start_time: formatLocalISO(midtermDate),
        end_time: formatLocalISO(midtermEnd),
        all_day: false,
        color: '#EF4444',
        location: course.schedule[0]?.location || 'TBD',
        event_type: 'exam',
        course_code: course.code
      })

      // Final exam
      const finalDate = new Date(finalWeek)
      finalDate.setDate(finalDate.getDate() + (course.schedule[0]?.day_of_week || 1))
      finalDate.setHours(9, 0, 0, 0) // 9 AM

      const finalEnd = new Date(finalDate)
      finalEnd.setHours(11, 0, 0, 0) // 11 AM

      events.push({
        title: `${course.name} - Final Exam`,
        description: `Final exam for ${course.code}`,
        start_time: formatLocalISO(finalDate),
        end_time: formatLocalISO(finalEnd),
        all_day: false,
        color: '#EF4444',
        location: course.schedule[0]?.location || 'TBD',
        event_type: 'exam',
        course_code: course.code
      })
    })

    // Add assignment due dates (example)
    courses.forEach((course: Course) => {
      for (let i = 1; i <= 5; i++) {
        const assignmentDate = new Date(semesterStartDate)
        assignmentDate.setDate(assignmentDate.getDate() + (i * 14)) // Every 2 weeks
        assignmentDate.setHours(23, 0, 0, 0) // 11 PM

        events.push({
          title: `${course.name} - Assignment ${i}`,
          description: `Assignment ${i} due for ${course.code}`,
          start_time: formatLocalISO(assignmentDate),
          end_time: formatLocalISO(assignmentDate),
          all_day: false,
          color: '#F59E0B',
          event_type: 'assignment',
          course_code: course.code
        })
      }
    })

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
