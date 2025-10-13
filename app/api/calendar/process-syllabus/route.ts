import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize OpenAI client only when needed
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    // Use Adobe PDF Services API for proper text extraction
    const {
      ServicePrincipalCredentials,
      PDFServices,
      MimeType,
      ExtractPDFParams,
      ExtractElementType,
      ExtractPDFJob,
      ExtractPDFResult
    } = await import('@adobe/pdfservices-node-sdk')

    // Load credentials from the JSON file
    const credentialsPath = '/Users/brianchen/Documents/LearninglyAI/app/pdfservices-api-credentials.json'
    const credentialsData = JSON.parse(require('fs').readFileSync(credentialsPath, 'utf8'))
    
    const credentials = new ServicePrincipalCredentials({
      clientId: credentialsData.client_credentials.client_id,
      clientSecret: credentialsData.client_credentials.client_secret
    })

    // Create PDF Services instance
    const pdfServices = new PDFServices({ credentials })

    // Create a readable stream from the buffer
    const { Readable } = require('stream')
    const readStream = new Readable({
      read() {
        this.push(buffer)
        this.push(null)
      }
    })

    // Upload the PDF
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF
    })

    // Create parameters for text extraction
    const params = new ExtractPDFParams({
      elementsToExtract: [ExtractElementType.TEXT]
    })

    // Create and submit the job
    const job = new ExtractPDFJob({ inputAsset, params })
    const pollingURL = await pdfServices.submit({ job })
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult
    })

    // Get the extracted text
    if (!pdfServicesResponse.result) {
      throw new Error('Adobe PDF Services did not return a result')
    }
    
    const resultAsset = pdfServicesResponse.result.resource
    const streamAsset = await pdfServices.getContent({ asset: resultAsset })
    
    // Convert stream to text
    const chunks: Buffer[] = []
    for await (const chunk of streamAsset.readStream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk)
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk))
      } else {
        chunks.push(Buffer.from(chunk))
      }
    }
    const zipBuffer = Buffer.concat(chunks)
    
    // Extract text from the ZIP file (Adobe returns a ZIP with JSON files)
    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(zipBuffer)
    const zipEntries = zip.getEntries()
    
    let extractedText = ''
    let previousElement: any = null
    
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.json')) {
        const jsonContent = entry.getData().toString('utf8')
        const jsonData = JSON.parse(jsonContent)
        
        console.log('Adobe PDF JSON structure:', JSON.stringify(jsonData).substring(0, 1000))
        
        // Extract text from the JSON structure with better formatting
        if (jsonData.elements) {
          for (const element of jsonData.elements) {
            if (element.Text && element.Text.trim()) {
              // Check if this is a new paragraph or line
              const text = element.Text.trim()
              
              // Add line break if this is a new text block or if Path indicates new line
              if (previousElement) {
                // If there's a significant position change or it's a new paragraph
                if (element.Path && element.Path !== previousElement.Path) {
                  extractedText += '\n'
                }
                // If bounds change significantly (new line)
                else if (element.Bounds && previousElement.Bounds) {
                  const yDiff = Math.abs(element.Bounds[1] - previousElement.Bounds[1])
                  if (yDiff > 5) { // New line
                    extractedText += '\n'
                  } else {
                    extractedText += ' '
                  }
                } else {
                  extractedText += ' '
                }
              }
              
              extractedText += text
              previousElement = element
            }
          }
        }
      }
    }

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error('Adobe PDF Services text extraction yielded insufficient content')
    }

    // Clean up excessive whitespace while preserving line breaks
    extractedText = extractedText
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/\n\s+/g, '\n') // Remove spaces after newlines
      .replace(/\s+\n/g, '\n') // Remove spaces before newlines
      .replace(/\n{3,}/g, '\n\n') // Limit multiple newlines to 2
      .trim()

    console.log('Successfully extracted text using Adobe PDF Services, length:', extractedText.length)
    console.log('First 1000 characters of extracted text:')
    console.log(extractedText.substring(0, 1000))
    console.log('\n--- Middle section (chars 1000-2000) ---')
    console.log(extractedText.substring(1000, 2000))
    console.log('\n--- Last 1000 characters ---')
    console.log(extractedText.substring(Math.max(0, extractedText.length - 1000)))
    
    return extractedText

  } catch (error) {
    console.error('Adobe PDF Services failed, trying improved fallback method:', error)
    
    // Improved fallback: Look for text content in PDF streams
    const uint8Array = new Uint8Array(buffer)
    let text = ''
    
    // Look for text content between PDF stream markers
    const pdfString = Buffer.from(buffer).toString('latin1')
    
    // Find text content in PDF streams (between BT and ET markers)
    const textMatches = pdfString.match(/BT\s*([\s\S]*?)\s*ET/g)
    if (textMatches) {
      for (const match of textMatches) {
        // Extract text between BT and ET
        const textContent = match.replace(/BT\s*/, '').replace(/\s*ET$/, '')
        
        // Look for text commands (Tj, TJ, etc.)
        const textCommands = textContent.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g)
        if (textCommands) {
          for (const command of textCommands) {
            // Extract text from parentheses or brackets
            const textMatch = command.match(/\(([^)]+)\)|\[([^\]]+)\]/)
            if (textMatch) {
              const extractedText = textMatch[1] || textMatch[2]
              if (extractedText && extractedText.trim().length > 0) {
                text += extractedText + ' '
              }
            }
          }
        }
      }
    }
    
    // If no text found in streams, try a different approach
    if (text.length < 50) {
      // Look for readable text patterns in the entire PDF
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i]
        if (char >= 32 && char <= 126) {
          text += String.fromCharCode(char)
        } else if (char === 10 || char === 13) {
          text += '\n'
        } else if (char === 9) {
          text += ' '
        }
      }
    }
    
    // Clean up the text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Filter out PDF metadata and structure
    text = text
      .replace(/%PDF[^\n]*\n/g, '') // Remove PDF headers
      .replace(/obj\s+\d+\s+\d+\s+endobj/g, '') // Remove PDF objects
      .replace(/xref[^\n]*\n/g, '') // Remove xref tables
      .replace(/trailer[^\n]*\n/g, '') // Remove trailer
      .replace(/startxref[^\n]*\n/g, '') // Remove startxref
      .replace(/%%EOF/g, '') // Remove EOF markers
      .replace(/\d+\s+\d+\s+n\s+/g, '') // Remove object references
      .replace(/\s+/g, ' ')
      .trim()
    
    if (text.length < 50) {
      throw new Error('PDF text extraction yielded insufficient content')
    }
    
    console.log('Extracted text using improved fallback method, length:', text.length)
    console.log('First 500 characters of extracted text:', text.substring(0, 500))
    return text
  }
}

interface CourseSchedule {
  day_of_week: number // 0-6 for Sunday-Saturday
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  location?: string
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar'
}

interface Course {
  name: string
  code: string
  instructor: string
  credits: number
  location?: string
  schedule: CourseSchedule[]
}

async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    // Download the file
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('application/pdf')) {
      // For PDF files, use pdf-parse to extract text
      const pdfBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(pdfBuffer)
      
      try {
        // Use a simpler approach for PDF text extraction
        // Convert PDF buffer to text using a basic method
        const extractedText = await extractTextFromPDFBuffer(buffer)
        
        if (!extractedText || extractedText.trim().length < 50) {
          throw new Error('PDF text extraction yielded insufficient content')
        }
        
        console.log('Successfully extracted text from PDF, length:', extractedText.length)
        return extractedText
      } catch (pdfError) {
        console.error('PDF parsing failed:', pdfError)
        throw new Error(`Failed to parse PDF: ${pdfError}`)
      }
    } else {
      // For non-PDF files (like Word docs, text files), read as text
      const text = await response.text()
      if (!text || text.trim().length < 10) {
        throw new Error('File appears to be empty or unreadable')
      }
      return text
    }
  } catch (error) {
    console.error('Error extracting text from file:', error)
    throw new Error(`Failed to extract text from file: ${error}`)
  }
}

async function parseSyllabusWithLLM(text: string): Promise<{ courses: Course[], semester_name: string }> {
  console.log('\n=== LLM PARSING DEBUG ===')
  console.log('Text length being sent to LLM:', text.length)
  console.log('\n--- First 1000 characters of text being sent to LLM ---')
  console.log(text.substring(0, 1000))
  console.log('\n--- Last 1000 characters of text being sent to LLM ---')
  console.log(text.substring(Math.max(0, text.length - 1000)))
  
  // Look for schedule-related keywords in the text
  const scheduleKeywords = ['schedule', 'meeting', 'time', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'room', 'location', 'when', 'where']
  const foundKeywords = scheduleKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  )
  console.log('\nSchedule-related keywords found in text:', foundKeywords.join(', '))
  console.log('========================\n')
  
  const prompt = `You are an expert at parsing academic syllabi. Extract course information from the following syllabus text and return ONLY a valid JSON object.

CRITICAL: You MUST extract the ACTUAL class meeting times from the document. Look for sections like:
- "Class Schedule", "Meeting Times", "Lecture Schedule", "When/Where"
- "Days/Times", "Class Meetings", "Course Schedule"
- Time patterns like "MWF 9:00-10:30" or "Tuesday/Thursday 2:00 PM - 3:15 PM"
- Location patterns like "Room 123", "Building A", etc.

DO NOT use placeholder or default times like "09:00-10:30". You MUST find the actual times mentioned in the document.

IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no explanations, no additional text.

Required JSON structure:
{
  "semester_name": "Fall 2024",
  "courses": [
    {
      "name": "Course Name",
      "code": "COURSE 101",
      "instructor": "Instructor Name",
      "credits": 3,
      "location": "Room/Building",
      "schedule": [
        {
          "day_of_week": 1,
          "start_time": "09:00",
          "end_time": "10:30",
          "location": "Room/Building",
          "type": "lecture"
        }
      ]
    }
  ]
}

Guidelines:
- Extract ALL courses mentioned in the syllabus
- For each course, extract ALL scheduled meeting times FROM THE DOCUMENT
- CAREFULLY look for class meeting times - they may be in various formats:
  * "MWF 9:00-10:30 AM" (Monday, Wednesday, Friday)
  * "T/Th 2:00-3:15 PM" (Tuesday, Thursday)
  * "Monday and Wednesday from 10:00 AM to 11:30 AM"
  * "Tuesdays 1:00 PM - 2:50 PM"
- Convert day names/abbreviations to numbers: Monday/M=1, Tuesday/T/Tu=2, Wednesday/W=3, Thursday/Th/R=4, Friday/F=5, Saturday/Sa=6, Sunday/Su=0
- Convert times to 24-hour format (e.g., "09:00" for 9:00 AM, "14:00" for 2:00 PM, "13:00" for 1:00 PM)
- Extract the ACTUAL location mentioned in the document (room number, building name)
- If location is not specified, use null
- If credits are not specified, estimate based on typical course credit hours (usually 3 or 4)
- Include all recurring class meetings, labs, tutorials, etc.
- Type should be "lecture" for regular classes, "lab" for laboratory sessions, "tutorial" for discussion sections, "seminar" for seminars

Syllabus text:
${text}

Return ONLY the JSON object:`

  try {
    const openaiClient = getOpenAI()
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a JSON parser specialized in extracting structured data from academic syllabi. Always return valid JSON only. No markdown, no backticks, no explanations. You must extract the ACTUAL class meeting times, days, and locations from the document - never use placeholder or default values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    })

    let content = response.choices[0]?.message?.content || '{}'
    
    console.log('\n=== RAW LLM RESPONSE ===')
    console.log('Response length:', content.length)
    console.log('Full response:')
    console.log(content)
    console.log('========================\n')
    
    // Clean up the response to ensure it's valid JSON
    content = content.trim()
    
    // Remove any markdown formatting or backticks
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Remove any leading/trailing text that's not JSON
    const jsonStart = content.indexOf('{')
    const jsonEnd = content.lastIndexOf('}') + 1
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      content = content.substring(jsonStart, jsonEnd)
    }
    
    console.log('Cleaned LLM response:', content.substring(0, 500) + '...')
    
    // Parse the JSON response
    const parsedData = JSON.parse(content)
    
    // Validate the structure
    if (!parsedData.courses || !Array.isArray(parsedData.courses)) {
      throw new Error('Invalid course data structure - missing courses array')
    }
    
    if (!parsedData.semester_name) {
      parsedData.semester_name = 'Fall 2024' // Default fallback
    }
    
    console.log('Successfully parsed syllabus with', parsedData.courses.length, 'courses')
    
    // Log extracted schedule information for debugging
    parsedData.courses.forEach((course: Course, index: number) => {
      console.log(`Course ${index + 1}: ${course.name} (${course.code})`)
      console.log(`  Instructor: ${course.instructor}`)
      console.log(`  Credits: ${course.credits}`)
      console.log(`  Location: ${course.location || 'Not specified'}`)
      console.log(`  Schedule (${course.schedule.length} entries):`)
      course.schedule.forEach((sched, schedIndex) => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        console.log(`    ${schedIndex + 1}. ${dayNames[sched.day_of_week]} ${sched.start_time}-${sched.end_time} (${sched.type}) at ${sched.location || 'TBD'}`)
      })
    })
    
    return parsedData
  } catch (error) {
    console.error('Error parsing syllabus with LLM:', error)
    throw new Error(`Failed to parse syllabus: ${error}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { file_url, file_name, file_type } = await request.json()

    if (!file_url || !file_name) {
      return NextResponse.json(
        { error: 'File URL and name are required' },
        { status: 400 }
      )
    }

    // Check OpenAI API key availability
    try {
      getOpenAI()
    } catch (error) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('Processing syllabus:', { file_url, file_name, file_type })

    // Step 1: Extract text from the PDF/syllabus
    const extractedText = await extractTextFromPDF(file_url)
    console.log('Extracted text length:', extractedText.length)

    // Step 2: Use LLM to parse the syllabus and extract course information
    const parsedData = await parseSyllabusWithLLM(extractedText)
    console.log('Parsed courses:', parsedData.courses.length)

    return NextResponse.json({
      courses: parsedData.courses,
      semester_name: parsedData.semester_name
    })

  } catch (error) {
    console.error('Error processing syllabus:', error)
    return NextResponse.json(
      { error: `Failed to process syllabus: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
