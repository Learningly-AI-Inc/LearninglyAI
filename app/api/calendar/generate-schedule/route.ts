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
}

export async function POST(request: NextRequest) {
  try {
    const { syllabus_document_id, semester_name, courses } = await request.json()

    if (!syllabus_document_id || !semester_name || !courses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate semester dates based on semester name
<<<<<<< HEAD
    const currentYear = new Date().getFullYear()
    let semesterStartDate: Date
    let semesterEndDate: Date
    
    if (semester_name.toLowerCase().includes('spring')) {
      // Spring semester: January to May
      const year = semester_name.includes('2025') ? 2025 : currentYear
=======
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    let semesterStartDate: Date
    let semesterEndDate: Date

    // Extract year from semester name if present
    const yearMatch = semester_name.match(/20\d{2}/)
    const specifiedYear = yearMatch ? parseInt(yearMatch[0]) : null

    if (semester_name.toLowerCase().includes('spring')) {
      // Spring semester: January to May
      // Use specified year, or if after May, use next year, otherwise current year
      const year = specifiedYear || (currentMonth > 5 ? currentYear + 1 : currentYear)
>>>>>>> 5b9d8089b63862dc5b62e41ea9c11781c3b58fd1
      semesterStartDate = new Date(`${year}-01-15`) // Spring semester start
      semesterEndDate = new Date(`${year}-05-15`) // Spring semester end
    } else if (semester_name.toLowerCase().includes('fall')) {
      // Fall semester: August to December
<<<<<<< HEAD
      const year = semester_name.includes('2024') ? 2024 : currentYear
=======
      // Use specified year, or if before August, use current year, otherwise current year
      const year = specifiedYear || currentYear
>>>>>>> 5b9d8089b63862dc5b62e41ea9c11781c3b58fd1
      semesterStartDate = new Date(`${year}-08-26`) // Fall semester start
      semesterEndDate = new Date(`${year}-12-13`) // Fall semester end
    } else if (semester_name.toLowerCase().includes('summer')) {
      // Summer semester: May to August
<<<<<<< HEAD
      const year = semester_name.includes('2025') ? 2025 : currentYear
      semesterStartDate = new Date(`${year}-05-15`) // Summer semester start
      semesterEndDate = new Date(`${year}-08-15`) // Summer semester end
    } else {
      // Default to current semester
      const now = new Date()
      const month = now.getMonth() + 1
      if (month >= 1 && month <= 5) {
        // Spring
        semesterStartDate = new Date(`${currentYear}-01-15`)
        semesterEndDate = new Date(`${currentYear}-05-15`)
      } else if (month >= 8 && month <= 12) {
        // Fall
        semesterStartDate = new Date(`${currentYear}-08-26`)
        semesterEndDate = new Date(`${currentYear}-12-13`)
      } else {
        // Summer
=======
      const year = specifiedYear || currentYear
      semesterStartDate = new Date(`${year}-05-15`) // Summer semester start
      semesterEndDate = new Date(`${year}-08-15`) // Summer semester end
    } else {
      // Default to current or upcoming semester based on current date
      if (currentMonth >= 1 && currentMonth <= 5) {
        // Currently in Spring - use Spring dates
        semesterStartDate = new Date(`${currentYear}-01-15`)
        semesterEndDate = new Date(`${currentYear}-05-15`)
      } else if (currentMonth >= 8 && currentMonth <= 12) {
        // Currently in Fall - use Fall dates
        semesterStartDate = new Date(`${currentYear}-08-26`)
        semesterEndDate = new Date(`${currentYear}-12-13`)
      } else {
        // Currently in Summer - use Summer dates
>>>>>>> 5b9d8089b63862dc5b62e41ea9c11781c3b58fd1
        semesterStartDate = new Date(`${currentYear}-05-15`)
        semesterEndDate = new Date(`${currentYear}-08-15`)
      }
    }
    
    console.log(`Generating schedule for ${semester_name}: ${semesterStartDate.toISOString().split('T')[0]} to ${semesterEndDate.toISOString().split('T')[0]}`)

    // Generate events for each course
    const events: CalendarEvent[] = []
    
    // Generate holidays based on semester
    const holidays = []
    if (semester_name.toLowerCase().includes('spring')) {
      // Spring holidays
      const year = semester_name.includes('2025') ? 2025 : currentYear
      holidays.push(
        { name: "Martin Luther King Jr. Day", date: `${year}-01-20`, type: "national" },
        { name: "Presidents' Day", date: `${year}-02-17`, type: "national" },
        { name: "Spring Break", date: `${year}-03-17`, type: "academic" },
        { name: "Memorial Day", date: `${year}-05-26`, type: "national" }
      )
    } else if (semester_name.toLowerCase().includes('fall')) {
      // Fall holidays
      const year = semester_name.includes('2024') ? 2024 : currentYear
      holidays.push(
        { name: "Labor Day", date: `${year}-09-02`, type: "national" },
        { name: "Thanksgiving Break", date: `${year}-11-28`, type: "academic" },
        { name: "Thanksgiving Break", date: `${year}-11-29`, type: "academic" }
      )
    }

    // Generate class events
    courses.forEach((course: Course) => {
      course.schedule.forEach((schedule) => {
        const startDate = new Date(semesterStartDate)
        const endDate = new Date(semesterEndDate)
        
        // Find the first occurrence of the day of week
        const dayOffset = (schedule.day_of_week - startDate.getDay() + 7) % 7
        startDate.setDate(startDate.getDate() + dayOffset)
        
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
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
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
    })

    // Add exam periods (midterm and final)
    const midtermWeek = new Date(semesterStartDate)
    midtermWeek.setDate(midtermWeek.getDate() + 42) // ~6 weeks into semester
    
    const finalWeek = new Date(semesterEndDate)
    finalWeek.setDate(finalWeek.getDate() - 7) // Week before finals

    courses.forEach((course: Course) => {
      // Midterm exam
      const midtermDate = new Date(midtermWeek)
      midtermDate.setDate(midtermDate.getDate() + (course.schedule[0]?.day_of_week || 1))
      
      events.push({
        title: `${course.name} - Midterm Exam`,
        description: `Midterm exam for ${course.code}`,
        start_time: new Date(midtermDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
        end_time: new Date(midtermDate.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM
        all_day: false,
        color: '#EF4444',
        location: course.schedule[0]?.location || 'TBD',
        event_type: 'exam',
        course_code: course.code
      })

      // Final exam
      const finalDate = new Date(finalWeek)
      finalDate.setDate(finalDate.getDate() + (course.schedule[0]?.day_of_week || 1))
      
      events.push({
        title: `${course.name} - Final Exam`,
        description: `Final exam for ${course.code}`,
        start_time: new Date(finalDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
        end_time: new Date(finalDate.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM
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
        
        events.push({
          title: `${course.name} - Assignment ${i}`,
          description: `Assignment ${i} due for ${course.code}`,
          start_time: new Date(assignmentDate.getTime() + 23 * 60 * 60 * 1000).toISOString(), // 11 PM
          end_time: new Date(assignmentDate.getTime() + 23 * 60 * 60 * 1000).toISOString(),
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
