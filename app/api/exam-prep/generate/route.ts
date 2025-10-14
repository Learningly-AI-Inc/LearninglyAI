import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { openai, DEFAULT_MODEL } from '@/lib/openai'
import { subscriptionService } from '@/lib/subscription-service'

export const runtime = 'nodejs'

type Difficulty = 'easy' | 'medium' | 'hard'

interface GenerateBody {
  // Either pass exam_files ids (from /api/exam-prep/upload) or reading_documents ids (from /api/reading/upload)
  fileIds?: string[]
  documentIds?: string[]
  sampleQuestionIds?: string[] // Sample questions from professors
  count?: number
  durationMinutes?: number
  difficulty?: Difficulty
  title?: string
  instructions?: string
  quizMode?: 'rapid-fire' | 'scheduled'
}

function detectSampleExamHeuristic(text: string): { isSample: boolean; score: number } {
  try {
    const lower = (text || '').toLowerCase()
    const questionMarkers = (lower.match(/\bquestion\s*\d{0,3}\b/g) || []).length + (lower.match(/\bq\s*\d{1,3}\b/g) || []).length
    const optionMarkers = (lower.match(/(^|\n)\s*[a-d][\).]\s/g) || []).length
    const trueFalse = (lower.match(/true\s*\/\s*false|true\s*or\s*false/g) || []).length
    const mcqPhrases = (lower.match(/multiple\s*choice|mcq|choose\s+the\s+correct/g) || []).length
    const pointsMarkers = (lower.match(/\b\d+\s*(?:points|pts)\b/g) || []).length
    const dashNumbers = (lower.match(/(^|\n)\s*\d+\s*[\).]/g) || []).length

    // Weighted score
    const score = questionMarkers * 2 + optionMarkers * 3 + trueFalse * 2 + mcqPhrases * 2 + pointsMarkers + dashNumbers
    const isSample = score >= 12 || (optionMarkers >= 8 && questionMarkers >= 3)
    return { isSample, score }
  } catch {
    return { isSample: false, score: 0 }
  }
}

async function fetchTextsForExamFiles(supabase: any, fileIds: string[], userId: string): Promise<string[]> {
  if (fileIds.length === 0) return []
  const { data, error } = await supabase
    .from('documents')
    .select('id, extracted_text, file_path, file_type, original_filename, processing_status')
    .in('id', fileIds)
    .eq('user_id', userId)
    .eq('document_type', 'exam-prep')

  console.log('🔍 fetchTextsForExamFiles query:', {
    fileIds,
    userId,
    foundDocuments: data?.length || 0,
    error: error?.message,
    documents: data?.map((d: any) => ({
      id: d.id,
      filename: d.original_filename,
      hasText: !!d.extracted_text,
      textLength: d.extracted_text?.length || 0,
      processingStatus: d.processing_status
    }))
  })

  if (error) throw error

  const results: string[] = []

  for (const doc of data || []) {
    let text = doc.extracted_text || ''

    // If text is missing or empty, try on-demand extraction
    if (!text || text.trim().length < 50) {
      console.log('🛠️ Attempting on-demand extraction for exam-prep document:', doc.id)
      const extractedText = await attemptOnDemandExtraction(supabase, doc, userId)
      if (extractedText) {
        text = extractedText
      }
    }

    if (text && text.trim().length > 0) {
      results.push(text)
    }
  }

  return results
}

// OPTIMIZED: Fast-only on-demand extraction (no Adobe Services)
async function attemptOnDemandExtraction(supabase: any, document: any, userId: string): Promise<string> {
  try {
    if (!document.file_path) {
      console.warn('⚠️ No file_path for document:', document.id)
      return ''
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from('exam-files')
      .download(document.file_path)

    if (downloadError || !blob) {
      console.error('❌ Failed to download file:', downloadError)
      return ''
    }

    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = String(document.file_type || document.original_filename || '').toLowerCase()
    let extractedText = ''

    // Only use fast extraction methods
    if (ext.includes('pdf')) {
      try {
        const PDFParser = (await import('pdf2json')).default
        
        extractedText = await new Promise((resolve, reject) => {
          const pdfParser = new PDFParser(null, true)
          
          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(errData.parserError)
          })
          
          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              const textParts: string[] = []
              
              if (pdfData.Pages) {
                for (const page of pdfData.Pages) {
                  if (page.Texts) {
                    for (const text of page.Texts) {
                      if (text.R) {
                        for (const run of text.R) {
                          if (run.T) {
                            // Safely decode URI-encoded text
                            try {
                              textParts.push(decodeURIComponent(run.T))
                            } catch (e) {
                              // If decoding fails, use the raw text
                              textParts.push(run.T)
                            }
                          }
                        }
                      }
                    }
                  }
                  textParts.push('\n\n')
                }
              }
              
              const text = textParts.join(' ').replace(/\s+/g, ' ').trim()
              resolve(text)
            } catch (err) {
              reject(err)
            }
          })
          
          pdfParser.parseBuffer(buffer)
        })
        
        console.log(`✅ Fast extracted ${extractedText.length} chars with pdf2json`)
      } catch (pdfError) {
        console.error('❌ pdf2json extraction failed:', pdfError)
      }
    } else if (ext.includes('docx')) {
      try {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        extractedText = String(result.value || '').trim()
        console.log(`✅ Extracted ${extractedText.length} chars from DOCX`)
      } catch (docxError) {
        console.error('❌ DOCX extraction failed:', docxError)
      }
    } else if (ext.includes('txt')) {
      extractedText = buffer.toString('utf-8').trim()
      console.log(`✅ Extracted ${extractedText.length} chars from TXT`)
    }

    extractedText = extractedText
      .replace(/\u0000/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()

    if (extractedText && extractedText.length > 50) {
      try {
        await supabase
          .from('documents')
          .update({
            extracted_text: extractedText,
            text_length: extractedText.length,
            processing_status: 'completed',
            page_count: Math.max(1, Math.ceil(extractedText.length / 2000)),
            updated_at: new Date().toISOString()
          })
          .eq('id', document.id)
          .eq('user_id', userId)
        console.log('✅ Updated document with extracted text:', document.id)
      } catch (updateError) {
        console.error('⚠️ Failed to update document:', updateError)
      }
      return extractedText
    }

    return ''
  } catch (error) {
    console.error('❌ On-demand extraction failed:', error)
    return ''
  }
}


async function fetchTextsForReadingDocuments(supabase: any, docIds: string[], userId: string): Promise<string[]> {
  if (docIds.length === 0) return []
  const { data, error } = await supabase
    .from('documents')
    .select('id, extracted_text')
    .in('id', docIds)
    .eq('user_id', userId)
    .eq('document_type', 'reading')
  if (error) throw error
  return (data || []).map((r: { extracted_text?: string }) => (r.extracted_text || '')).filter(Boolean)
}

async function fetchSampleQuestions(supabase: any, sampleIds: string[], userId: string): Promise<string[]> {
  if (sampleIds.length === 0) return []
  const { data, error } = await supabase
    .from('documents')
    .select('id, extracted_text')
    .in('id', sampleIds)
    .eq('user_id', userId)
    .eq('document_type', 'reading')
  if (error) throw error
  return (data || []).map((r: { extracted_text?: string }) => (r.extracted_text || '')).filter(Boolean)
}

// Some uploads (when extraction fails) may store a boilerplate placeholder like
// "PDF Document Analysis ... This document has been successfully uploaded ...".
// Those strings pollute exam generation. Strip them out before prompting.
function sanitizeSourceContent(text: string): string {
  try {
    let cleaned = String(text || '')
      .replace(/PDF\s+Document\s+Analysis[\s\S]*?The\s+document\s+is\s+now\s+available[\s\S]*?questions\./gi, '')
      .replace(/Document\s+Analysis[\s\S]*?document\s+is\s+now\s+available[\s\S]*?questions\./gi, '')
      .replace(/This\s+document\s+has\s+been\s+successfully\s+uploaded[\s\S]*?ready\s+for\s+analysis\.?/gi, '')
      .replace(/Ask\s+questions\s+about\s+the\s+document[\s\S]*?document\-related\s+tasks/gi, '')
      .replace(/Get\s+help\s+with\s+document\-related\s+tasks/gi, '')
      .replace(/Discuss\s+the\s+document's\s+purpose/gi, '')
      .replace(/Review\s+the\s+document\s+for\s+errors/gi, '')
      // Extra UI/boilerplate phrases that can poison prompts
      .replace(/(drag\s+and\s+drop|choose\s+files|click\s+to\s+upload|processing\s+status|file\s+upload|file\s+deletion|we\s+can\s+help\s+you|help\s+the\s+user|ai\s+will\s+analyze|analysis\s+complete|upload\s+guidelines)/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // If the content is almost empty after cleaning, return empty to signal unusable text
    if (cleaned.length < 200) return ''
    return cleaned
  } catch {
    return text
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateBody = await req.json()
    const count = Math.min(Math.max(body.count ?? 20, 5), 50)
    const durationMinutes = Math.min(Math.max(body.durationMinutes ?? 60, 10), 240)
    const difficulty: Difficulty = (body.difficulty ?? 'medium') as Difficulty

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check usage limits for exam sessions
    const canGenerate = await subscriptionService.checkUsageLimit(user.id, 'exam_sessions', 1);
    if (!canGenerate) {
      const subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id);
      const isFreePlan = subscription?.subscription_plans?.name?.toLowerCase().includes('free');
      
      return NextResponse.json(
        { 
          error: 'Exam session limit exceeded',
          message: isFreePlan 
            ? 'You\'ve reached your free plan exam session limit. Upgrade to continue generating exams.'
            : 'Exam session limit exceeded.',
          needsUpgrade: isFreePlan,
          limitType: 'exam_sessions'
        },
        { status: 429 }
      );
    }

    // Collect texts strictly from the user's own uploads
    // Frontend sends exam-prep IDs in `documentIds`; support both fields for robustness
    const examPrepIds = (Array.isArray(body?.documentIds) && body.documentIds.length > 0)
      ? body.documentIds
      : (body.fileIds || [])

    console.log('📚 Fetching documents:', {
      examPrepIds,
      documentIds: body.documentIds,
      fileIds: body.fileIds,
      sampleQuestionIds: body.sampleQuestionIds
    })

    let textsA = await fetchTextsForExamFiles(supabase, examPrepIds, user.id)
    let textsB = await fetchTextsForReadingDocuments(supabase, body.documentIds || [], user.id)
    let sampleTexts = await fetchSampleQuestions(supabase, body.sampleQuestionIds || [], user.id)
    let texts = [...textsA, ...textsB].filter(Boolean)

    console.log('📄 Text extraction results:', {
      textsACount: textsA.length,
      textsBCount: textsB.length,
      sampleTextsCount: sampleTexts.length,
      totalTexts: texts.length,
      textsALengths: textsA.map(t => t?.length || 0),
      textsBLengths: textsB.map(t => t?.length || 0)
    })

    if (texts.length === 0) {
      return NextResponse.json({ error: 'No extracted text available from uploaded documents. Please ensure your documents have been processed before generating an exam.' }, { status: 400 })
    }

    console.log('📚 Document extraction:', {
      examFiles: textsA.length,
      readingDocs: textsB.length,
      totalTexts: texts.length,
      firstTextPreview: texts[0]?.slice(0, 500)
    })

    // Sanitize each document separately; drop boilerplate-only docs
    const sanitizedDocs = texts
      .map(t => sanitizeSourceContent(t))
      .filter(t => typeof t === 'string' && t.trim().length >= 200)
    const sourceDocs = sanitizedDocs.length > 0 ? sanitizedDocs : texts
    const rawCombined = sourceDocs.join('\n\n---\n\n').slice(0, 100_000)
    const combined = rawCombined

    console.log('📄 Content for generation:', {
      sanitizedCount: sanitizedDocs.length,
      totalLength: combined.length,
      preview: combined.slice(0, 1000)
    })

    // OPTIMIZED: Single fast generation call instead of slow section-by-section processing

    // Optimized: Single efficient prompt for all questions
    const systemPrompt = `You are an expert exam question generator. Create high-quality multiple-choice questions that test deep understanding of the provided content.

RULES:
1. Questions must test specific facts, concepts, or information from the document
2. Never ask about document format, structure, or processing
3. Focus on actual subject matter and content
4. Each question must have exactly 4 options (A-D) with one correct answer
5. Provide clear, educational explanations
6. Return valid JSON with exactly ${count} questions`

    // Include sample questions in the prompt if available
    const sampleQuestionsText = sampleTexts.length > 0 
      ? `\n\nSAMPLE QUESTIONS (use as style reference):\n${sampleTexts.map(text => sanitizeSourceContent(text).slice(0, 2000)).join('\n\n---\n\n')}`
      : ''

    const userPrompt = `Create exactly ${count} multiple-choice questions from the content below.
Difficulty level: ${difficulty}
${sampleQuestionsText ? '\nMatch the style and format of the sample questions provided.' : ''}

CONTENT:
${combined.slice(0, 80000)}${sampleQuestionsText}

Return as JSON: {"questions":[{"id":"q1","type":"mcq","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"...","difficulty":"${difficulty}","topic":"..."}]}`

    console.log('🎯 Generating questions:', { 
      promptLength: userPrompt.length, 
      questionCount: count,
      contentLength: combined.length,
      difficulty 
    })

    // Single optimized API call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.4, // Slightly higher for more variety
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let parsedExam
    try {
      parsedExam = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsedExam = match ? JSON.parse(match[0]) : { questions: [] }
    }

    console.log('🔍 Parsed exam:', {
      questionCount: parsedExam?.questions?.length || 0,
      firstQuestion: parsedExam?.questions?.[0]?.question
    })

    // Simple normalization and validation
    const questions = Array.isArray(parsedExam?.questions) ? parsedExam.questions : []
    const mappedQuestions = questions
      .filter((q: any) => q && Array.isArray(q.options) && q.options.length >= 4)
        .map((q: any, i: number) => {
          const cleanOption = (s: any) => String(s).replace(/^[A-D][).]\s*/i, '').trim()
          const opts = q.options.slice(0, 4).map((o: any) => cleanOption(o))
          const letter = String(q.correctAnswer || 'A').trim().toUpperCase().charAt(0)
          const validLetter = ['A','B','C','D'].includes(letter) ? letter : 'A'
          return {
            id: String(q.id || `q_${i + 1}`),
            type: 'mcq',
            question: String(q.question || '').trim(),
            options: opts,
            correctAnswer: validLetter,
            explanation: String(q.explanation || ''),
          difficulty: String(q.difficulty || difficulty),
          topic: String(q.topic || '')
        }
      })
        .slice(0, count)

    const normalized = {
      examTitle: body.title || 'Practice Exam',
      instructions: body.instructions || 'Choose the best answer for each question.',
      duration: durationMinutes,
      questions: mappedQuestions
    }

    const exam = { 
      ...normalized, 
      instructions: body.instructions || normalized.instructions,
      quizMode: body.quizMode || 'rapid-fire'
    }

    // Track usage after successful exam generation
    try {
      await subscriptionService.incrementUsage(user.id, 'exam_sessions', 1);
    } catch (usageError) {
      console.error('Failed to track exam session usage:', usageError);
    }

    return NextResponse.json({ success: true, exam })
  } catch (e: any) {
    console.error('Generate exam error:', e)
    return NextResponse.json({ error: 'Failed to generate exam', details: e?.message || String(e) }, { status: 500 })
  }
}


