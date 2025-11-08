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
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }
    openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    })
  }
  return openai
}
//commentc
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

    // Try to load Adobe credentials from environment or file
    let credentials
    if (process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET) {
      credentials = new ServicePrincipalCredentials({
        clientId: process.env.ADOBE_CLIENT_ID,
        clientSecret: process.env.ADOBE_CLIENT_SECRET
      })
    } else {
      // Try to find credentials file in project root (for local development)
      const fs = require('fs')
      const path = require('path')
      const possiblePaths = [
        path.join(process.cwd(), 'pdfservices-api-credentials.json'),
        path.join(process.cwd(), 'app', 'pdfservices-api-credentials.json'),
        '/Users/brianchen/Documents/LearninglyAI/app/pdfservices-api-credentials.json'
      ]

      let credentialsData = null
      for (const credPath of possiblePaths) {
        try {
          if (fs.existsSync(credPath)) {
            credentialsData = JSON.parse(fs.readFileSync(credPath, 'utf8'))
            console.log('Found Adobe credentials at:', credPath)
            break
          }
        } catch (err) {
          console.log('Could not read credentials from:', credPath)
        }
      }

      if (!credentialsData) {
        console.warn('Adobe PDF credentials not found, falling back to basic PDF parsing')
        throw new Error('Adobe PDF credentials not found - using fallback method')
      }

      credentials = new ServicePrincipalCredentials({
        clientId: credentialsData.client_credentials.client_id,
        clientSecret: credentialsData.client_credentials.client_secret
      })
    }

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
  specific_date?: string // ISO date for specific class sessions (e.g., "2024-09-20")
}

interface Course {
  name: string
  code: string
  instructor: string
  credits: number
  location?: string
  schedule: CourseSchedule[]
  specific_sessions?: Array<{
    date: string // ISO date
    title: string
    start_time: string
    end_time: string
    location?: string
    type: string
  }>
}

async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    // Download the file
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    const buffer = await response.arrayBuffer()
    
    if (contentType.includes('application/pdf')) {
      // For PDF files, use Adobe PDF Services or fallback method
      try {
        const extractedText = await extractTextFromPDFBuffer(Buffer.from(buffer))
        
        if (!extractedText || extractedText.trim().length < 50) {
          throw new Error('PDF text extraction yielded insufficient content')
        }
        
        console.log('Successfully extracted text from PDF, length:', extractedText.length)
        return extractedText
      } catch (pdfError) {
        console.error('PDF parsing failed:', pdfError)
        throw new Error(`Failed to parse PDF: ${pdfError}`)
      }
    } else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
               contentType.includes('application/msword')) {
      // For DOCX/DOC files, use mammoth to extract text
      try {
        console.log('Attempting to extract text from DOCX/DOC file...')
        const mammoth = await import('mammoth')
        console.log('Mammoth library loaded successfully')
        
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
        const extractedText = result.value
        
        if (!extractedText || extractedText.trim().length < 10) {
          throw new Error('DOCX text extraction yielded insufficient content')
        }
        
        console.log('Successfully extracted text from DOCX/DOC, length:', extractedText.length)
        return extractedText
      } catch (docxError) {
        console.error('DOCX parsing failed:', docxError)
        
        // Try fallback method for DOCX files
        try {
          console.log('Attempting fallback DOCX parsing...')
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
          if (text && text.trim().length > 10) {
            console.log('Fallback DOCX parsing succeeded, length:', text.length)
            return text
          }
        } catch (fallbackError) {
          console.error('Fallback DOCX parsing also failed:', fallbackError)
        }
        
        throw new Error(`Failed to parse DOCX/DOC: ${docxError}`)
      }
    } else {
      // For other files (like text files), read as text
      const text = new TextDecoder().decode(buffer)
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

// Helper function to estimate token count (rough approximation)
function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

// Helper function to chunk text while preserving important sections
function chunkTextIntelligently(text: string, maxTokens: number = 25000): string[] {
  const chunks: string[] = []
  const maxChars = maxTokens * 4 // Convert tokens to characters
  
  // First, try to split by major sections
  const sections = text.split(/(?=\n[A-Z][A-Z\s]+\n)/) // Split before all-caps headers
  
  if (sections.length > 1) {
    let currentChunk = ''
    
    for (const section of sections) {
      if (currentChunk.length + section.length <= maxChars) {
        currentChunk += section
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = section
        } else {
          // Section is too large, split it further
          const subChunks = chunkTextByParagraph(section, maxChars)
          chunks.push(...subChunks)
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
  } else {
    // No clear sections, split by paragraphs
    chunks.push(...chunkTextByParagraph(text, maxChars))
  }
  
  return chunks.filter(chunk => chunk.length > 100) // Filter out tiny chunks
}

function chunkTextByParagraph(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\s*\n/)
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph
      } else {
        // Paragraph is too large, split by sentences
        const sentences = paragraph.split(/[.!?]+/)
        let sentenceChunk = ''
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length <= maxChars) {
            sentenceChunk += (sentenceChunk ? '. ' : '') + sentence.trim()
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim() + '.')
              sentenceChunk = sentence.trim()
            } else {
              // Single sentence is too large, truncate
              chunks.push(sentence.substring(0, maxChars - 3) + '...')
            }
          }
        }
        
        if (sentenceChunk) {
          currentChunk = sentenceChunk.trim() + '.'
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

async function parseSyllabusWithLLM(text: string): Promise<{ courses: Course[], semester_name: string }> {
  console.log('\n=== LLM PARSING DEBUG ===')
  console.log('Text length being sent to LLM:', text.length)
  console.log('Estimated tokens:', estimateTokenCount(text))
  
  // Check if text is too large for single LLM call
  const tokenCount = estimateTokenCount(text)
  const maxTokens = 25000 // Leave some buffer below the 30k limit
  
  if (tokenCount > maxTokens) {
    console.log('Text is too large for single LLM call, chunking...')
    
    // Try to extract the most relevant parts first
    const relevantText = extractRelevantSections(text)
    console.log('Relevant sections length:', relevantText.length)
    console.log('Relevant sections tokens:', estimateTokenCount(relevantText))
    
    if (estimateTokenCount(relevantText) <= maxTokens) {
      console.log('Using relevant sections only')
      return parseSyllabusWithLLMSingle(relevantText)
    } else {
      console.log('Even relevant sections are too large, using chunking approach')
      return parseSyllabusWithLLMChunked(text, maxTokens)
    }
  }
  
  return parseSyllabusWithLLMSingle(text)
}

// Extract the most relevant sections for syllabus parsing
function extractRelevantSections(text: string): string {
  const lines = text.split('\n')
  const relevantLines: string[] = []
  
  // Keywords that indicate important sections
  const importantKeywords = [
    'course', 'class', 'meeting', 'schedule', 'time', 'day', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'instructor', 'professor', 'room', 'location', 'building', 'credits', 'semester', 'term',
    'syllabus', 'overview', 'description', 'objectives', 'requirements', 'prerequisites'
  ]
  
  // Look for headers and important sections
  let inImportantSection = false
  let importantSectionLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    const isHeader = /^[A-Z][A-Z\s]+$/.test(lines[i]) || /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(lines[i])
    
    // Check if this line contains important keywords
    const hasImportantKeywords = importantKeywords.some(keyword => line.includes(keyword))
    
    if (isHeader && hasImportantKeywords) {
      // Start of important section
      if (importantSectionLines.length > 0) {
        relevantLines.push(...importantSectionLines)
        importantSectionLines = []
      }
      inImportantSection = true
      importantSectionLines.push(lines[i])
    } else if (inImportantSection) {
      // Continue collecting lines in important section
      importantSectionLines.push(lines[i])
      
      // Stop if we hit another header or empty line followed by non-important content
      if (isHeader && !hasImportantKeywords) {
        relevantLines.push(...importantSectionLines)
        importantSectionLines = []
        inImportantSection = false
      }
    } else if (hasImportantKeywords) {
      // Individual line with important keywords
      relevantLines.push(lines[i])
    }
  }
  
  // Add any remaining important section
  if (importantSectionLines.length > 0) {
    relevantLines.push(...importantSectionLines)
  }
  
  return relevantLines.join('\n')
}

// Parse syllabus with chunked approach
async function parseSyllabusWithLLMChunked(text: string, maxTokens: number): Promise<{ courses: Course[], semester_name: string }> {
  const chunks = chunkTextIntelligently(text, maxTokens)
  console.log(`Split text into ${chunks.length} chunks`)
  
  const allCourses: Course[] = []
  let semesterName = ''
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`)
    
    try {
      const chunkResult = await parseSyllabusWithLLMSingle(chunks[i])
      
      if (chunkResult.semester_name && !semesterName) {
        semesterName = chunkResult.semester_name
      }
      
      allCourses.push(...chunkResult.courses)
    } catch (error) {
      console.warn(`Failed to process chunk ${i + 1}:`, error)
      // Continue with other chunks
    }
  }
  
  // Deduplicate courses by name and code
  const uniqueCourses = allCourses.filter((course, index, self) => 
    index === self.findIndex(c => c.name === course.name && c.code === course.code)
  )
  
  console.log(`Extracted ${uniqueCourses.length} unique courses from ${chunks.length} chunks`)
  
  return {
    courses: uniqueCourses,
    semester_name: semesterName || `Fall ${new Date().getFullYear()}`
  }
}

// Original single LLM parsing function
async function parseSyllabusWithLLMSingle(text: string): Promise<{ courses: Course[], semester_name: string }> {
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
  
  const prompt = `Extract course information from this syllabus text. Return ONLY valid JSON.

CRITICAL RULES:
1. ONLY extract information EXPLICITLY stated in the document
2. DO NOT make up course names, codes, or details
3. If information is missing, use null or empty values
4. Extract ALL important academic dates including lectures, exams, assignments, and deadlines
5. Look for course schedules in various formats: weekly topics, specific dates, or recurring meeting times

JSON structure:
{
  "semester_name": "Fall 2025",
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
          "start_time": "14:00",
          "end_time": "15:20",
          "location": "Room/Building",
          "type": "lecture"
        }
      ],
      "specific_sessions": [
        {
          "date": "2025-04-21",
          "title": "Exam 1 - The middle and late Paleozoic",
          "start_time": "14:00",
          "end_time": "15:20",
          "location": "Room/Building",
          "type": "exam"
        },
        {
          "date": "2025-04-07",
          "title": "Week 3: Early animals",
          "start_time": "09:00",
          "end_time": "10:00",
          "location": "Room/Building",
          "type": "lecture"
        }
      ]
    }
  ]
}

Guidelines for extracting information:

1. COURSE INFORMATION:
   - Extract course name, code, instructor from the header/title section
   - Look for professor email, office hours, room numbers

2. WEEKLY SCHEDULES (if present):
   - Look for recurring meeting times like "Mo/We 2:00 PM - 3:20 PM" or "MWF 9:00-10:30"
   - Convert days: M/Mo/Mon=1, T/Tu/Tue=2, W/We/Wed=3, Th/Thu/R=4, F/Fri=5, Sa/Sat=6, Su/Sun=0
   - Convert times to 24-hour format (e.g., "14:00" for 2:00 PM)

3. SPECIFIC SESSIONS (very important):
   - Look for "Lectures and Reading Assignments", "Course Schedule", or similar sections
   - Extract EACH lecture topic with its date (e.g., "Week 3: Early animals" on specific date)
   - Extract ALL exam dates (e.g., "April 21: EXAM", "May 12: EXAM")
   - Extract assignment due dates, project deadlines
   - If only "Week X" is given without specific dates, estimate dates based on semester start/end
   - Set appropriate types: "lecture", "exam", "assignment", "lab", "tutorial", "final"

4. DATE CONVERSION:
   - Convert all dates to ISO format YYYY-MM-DD
   - If only month/day given (e.g., "April 21"), infer year from semester
   - If only "Week X" given, calculate dates based on semester start date

5. TIME INFERENCE:
   - If specific times aren't given but class meeting times are mentioned elsewhere, use those
   - If no times at all, use reasonable defaults (e.g., "09:00" to "10:30" for lectures)

Return ONLY the JSON object, no explanations or markdown.

Syllabus text:
${text}`

  try {
    const openaiClient = getOpenAI()
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a JSON parser specialized in extracting comprehensive academic schedule information from syllabi. Extract ALL important dates including lectures, exams, assignments, and deadlines. CRITICAL: You must ONLY extract information that is EXPLICITLY present in the document. DO NOT make up course names, codes, dates, or any other information. If information is not found, use null or empty arrays. Always return valid JSON only. No markdown, no backticks, no explanations. Be thorough in finding lecture schedules, even if they're listed as weekly topics rather than recurring meeting times."
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
      // Use current year for default
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      // Determine semester based on current month
      const semester = currentMonth >= 8 ? 'Fall' : currentMonth >= 5 ? 'Summer' : 'Spring'
      parsedData.semester_name = `${semester} ${currentYear}` // Default fallback
    }
    
    console.log('Successfully parsed syllabus with', parsedData.courses.length, 'courses')

    // Validate extracted data against common hallucinations
    const commonHallucinations = [
      'introduction to psychology',
      'psych 101',
      'psychology 101',
      'intro to psych',
      'general psychology'
    ]

    for (const course of parsedData.courses) {
      const courseLower = course.name?.toLowerCase() || ''
      const codeLower = course.code?.toLowerCase() || ''

      if (commonHallucinations.some(halluc => courseLower.includes(halluc) || codeLower.includes(halluc))) {
        console.warn('⚠️ POSSIBLE HALLUCINATION DETECTED:', course.name, course.code)
        console.warn('This may indicate the LLM could not find course information in the document')

        // Check if the original text contains this course name
        if (course.name && !text.toLowerCase().includes(course.name.toLowerCase().substring(0, 15))) {
          throw new Error(`LLM may have hallucinated course data. Could not find "${course.name}" in the original document. Please ensure the PDF text is readable.`)
        }
      }
    }

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

    // Check file size limits for Vercel (50MB limit for serverless functions)
    try {
      const response = await fetch(file_url, { method: 'HEAD' })
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const fileSizeMB = parseInt(contentLength) / (1024 * 1024)
        if (fileSizeMB > 50) {
          return NextResponse.json(
            { error: 'File is too large. Please upload a file smaller than 50MB.' },
            { status: 400 }
          )
        }
        console.log(`File size: ${fileSizeMB.toFixed(2)}MB`)
      }
    } catch (sizeError) {
      console.warn('Could not check file size:', sizeError)
      // Continue anyway - size check is not critical
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

    // Step 1: Extract text from the PDF/syllabus with timeout
    console.log('Starting text extraction...')
    const extractionStartTime = Date.now()
    
    const extractedText = await Promise.race([
      extractTextFromPDF(file_url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Text extraction timeout after 30 seconds')), 30000)
      )
    ]) as string
    
    const extractionTime = Date.now() - extractionStartTime
    console.log(`Text extraction completed in ${extractionTime}ms`)
    console.log('Extracted text length:', extractedText.length)
    console.log('File type:', file_type)
    console.log('First 500 characters of extracted text:', extractedText.substring(0, 500))

    // Step 2: Validate extracted text quality
    if (extractedText.length < 100) {
      console.error('Extracted text is too short:', extractedText)
      return NextResponse.json(
        {
          error: 'Failed to extract sufficient text from the document. The file may be an image-based PDF or corrupted.',
          extracted_text_preview: extractedText.substring(0, 500)
        },
        { status: 400 }
      )
    }

    // Step 3: Use LLM to parse the syllabus and extract course information with timeout
    console.log('Starting LLM parsing...')
    const llmStartTime = Date.now()
    
    const parsedData = await Promise.race([
      parseSyllabusWithLLM(extractedText),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM parsing timeout after 25 seconds')), 25000)
      )
    ]) as { courses: any[], semester_name: string }
    
    const llmTime = Date.now() - llmStartTime
    console.log(`LLM parsing completed in ${llmTime}ms`)
    console.log('Parsed courses:', parsedData.courses.length)

    // Step 4: Validate parsed data quality
    if (parsedData.courses.length === 0) {
      console.error('No courses extracted from syllabus')
      console.log('Extracted text preview:', extractedText.substring(0, 1000))
      return NextResponse.json(
        {
          error: 'Could not find any course information in the document. Please ensure the file contains course details and schedules.',
          extracted_text_preview: extractedText.substring(0, 1000)
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      courses: parsedData.courses,
      semester_name: parsedData.semester_name,
      extracted_text_preview: extractedText.substring(0, 500) // For debugging
    })

  } catch (error) {
    console.error('Error processing syllabus:', error)
    return NextResponse.json(
      { error: `Failed to process syllabus: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
