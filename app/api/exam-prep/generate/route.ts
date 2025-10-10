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

// Helper function for on-demand extraction
async function attemptOnDemandExtraction(supabase: any, document: any, userId: string): Promise<string> {
  try {
    // Download the original file
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
    console.log(`📄 Downloaded file for extraction: ${buffer.length} bytes`)

    const ext = String(document.file_type || document.original_filename || '').toLowerCase()
    let extractedText = ''

    if (ext.includes('pdf')) {
      // Try pdf-parse first
      try {
        const pdfParse = await import('pdf-parse')
        const data = await pdfParse.default(buffer)
        extractedText = String(data.text || '').trim()
        console.log(`✅ Extracted ${extractedText.length} chars with pdf-parse`)
      } catch (pdfError) {
        console.error('❌ pdf-parse failed:', pdfError)

        // Fallback to Adobe PDF Services if available
        try {
          const text = await adobeExportPdfToDocxExtractText(buffer)
          if (text) {
            extractedText = text
            console.log(`✅ Extracted ${extractedText.length} chars with Adobe Services`)
          }
        } catch (adobeError) {
          console.error('❌ Adobe extraction also failed:', adobeError)
        }
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

    // Clean and normalize the extracted text
    extractedText = extractedText
      .replace(/\u0000/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()

    // If extraction succeeded, update the database
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

// Helper: Export PDF -> DOCX using Adobe Services, then extract with mammoth
async function adobeExportPdfToDocxExtractText(pdfBuffer: Buffer): Promise<string> {
  try {
    const sdk: any = await import('@adobe/pdfservices-node-sdk')
    const mammoth = await import('mammoth')
    const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
    const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
    if (!clientId || !clientSecret) return ''

    // Convert buffer to readable stream
    const streamMod: any = await import('node:stream').catch(() => import('stream'))
    const ReadableAny = (streamMod as any).Readable || (streamMod as any).default?.Readable
    const rs = ReadableAny?.from ? ReadableAny.from(pdfBuffer) : new ReadableAny({
      read() {
        this.push(pdfBuffer)
        this.push(null)
      }
    })

    const credentials = new (sdk as any).ServicePrincipalCredentials({ clientId, clientSecret })
    const pdfServices = new (sdk as any).PDFServices({ credentials })
    const asset = await pdfServices.upload({ readStream: rs, mimeType: (sdk as any).MimeType.PDF })
    const params = new (sdk as any).ExportPDFParams({
      targetFormat: (sdk as any).ExportPDFTargetFormat.DOCX,
      ocrLocale: (sdk as any).ExportOCRLocale.EN_US
    })
    const job = new (sdk as any).ExportPDFJob({ inputAsset: asset, params })
    const poll = await pdfServices.submit({ job })
    const resp = await pdfServices.getJobResult({ pollingURL: poll, resultType: (sdk as any).ExportPDFResult })
    const docxAsset = resp.result.asset
    const streamAsset = await pdfServices.getContent({ asset: docxAsset })
    const chunks: Buffer[] = []
    const rs2: any = streamAsset.readStream
    await new Promise<void>((resolve, reject) => {
      rs2.on('data', (c: Buffer) => chunks.push(c))
      rs2.on('end', () => resolve())
      rs2.on('error', (e: any) => reject(e))
    })
    const docxBuffer = Buffer.concat(chunks)
    const { value } = await mammoth.extractRawText({ buffer: docxBuffer })
    return String(value || '').trim()
  } catch (e) {
    console.error('⚠️ Adobe export to DOCX failed:', e)
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
      // Attempt on-demand re-extraction for reading documents (Adobe Services -> DOCX -> mammoth)
      async function bufferToReadable(buf: Buffer): Promise<any> {
        try {
          const streamMod: any = await import('node:stream').catch(() => import('stream'))
          const ReadableAny = (streamMod as any).Readable || (streamMod as any).default?.Readable
          if (ReadableAny?.from) return ReadableAny.from(buf)
          return new ReadableAny({
            read() {
              this.push(buf)
              this.push(null)
            }
          })
        } catch {
          return buf as any
        }
      }
      async function adobeExtractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
        try {
          const sdk: any = await import('@adobe/pdfservices-node-sdk')
          const mammoth = await import('mammoth')
          const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
          const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
          if (!clientId || !clientSecret) return ''
          const credentials = new sdk.ServicePrincipalCredentials({ clientId, clientSecret })
          const pdfServices = new sdk.PDFServices({ credentials })
          const rs = await bufferToReadable(pdfBuffer)
          const asset = await pdfServices.upload({ readStream: rs, mimeType: sdk.MimeType.PDF })
          const params = new sdk.ExportPDFParams({ targetFormat: sdk.ExportPDFTargetFormat.DOCX, ocrLocale: sdk.ExportOCRLocale.EN_US })
          const job = new sdk.ExportPDFJob({ inputAsset: asset, params })
          const poll = await pdfServices.submit({ job })
          const resp = await pdfServices.getJobResult({ pollingURL: poll, resultType: sdk.ExportPDFResult })
          const docxAsset = resp.result.asset
          const streamAsset = await pdfServices.getContent({ asset: docxAsset })
          const chunks: Buffer[] = []
          const rs2: any = streamAsset.readStream
          await new Promise<void>((resolve, reject) => {
            rs2.on('data', (c: Buffer) => chunks.push(c))
            rs2.on('end', () => resolve())
            rs2.on('error', (e: any) => reject(e))
          })
          const docxBuffer = Buffer.concat(chunks)
          const { value } = await mammoth.extractRawText({ buffer: docxBuffer })
          return String(value || '').trim()
        } catch {
          return ''
        }
      }

      // For each reading document id, try to download and extract
      const docIds = Array.isArray(body.documentIds) ? body.documentIds : []
      for (const docId of docIds) {
        try {
          const { data: doc, error: docErr } = await supabase
            .from('reading_documents')
            .select('id, file_path, public_url, extracted_text')
            .eq('id', docId)
            .eq('user_id', user.id)
            .single()
          if (docErr || !doc) continue
          if (doc.extracted_text && String(doc.extracted_text).trim().length > 0) continue
          let buffer: Buffer | null = null
          if (doc.file_path) {
            try {
              const { data: blob } = await supabase.storage
                .from('reading-documents')
                .download(doc.file_path)
              if (blob) {
                const ab = await blob.arrayBuffer()
                buffer = Buffer.from(ab)
              }
            } catch {}
          }
          if (!buffer && doc.public_url) {
            try {
              const res = await fetch(doc.public_url)
              if (res.ok) {
                const ab = await res.arrayBuffer()
                buffer = Buffer.from(ab)
              }
            } catch {}
          }
          if (!buffer) continue
          const text = await adobeExtractTextFromPdf(buffer)
          if (text && text.length > 50) {
            await supabase
              .from('reading_documents')
              .update({ extracted_text: text, text_length: text.length, processing_status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', docId)
          }
        } catch {}
      }

      // Re-fetch texts after re-extraction
      textsA = await fetchTextsForExamFiles(supabase, body.fileIds || [], user.id)
      textsB = await fetchTextsForReadingDocuments(supabase, body.documentIds || [], user.id)
      texts = [...textsA, ...textsB].filter(Boolean)
      if (texts.length === 0) {
        return NextResponse.json({ error: 'No extracted text available from uploaded documents' }, { status: 400 })
      }
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

    // Helpers for strict grounding
    const normalize = (s: string) => String(s || '')
      .toLowerCase()
      .replace(/[“”„‟‶\u201C\u201D]/g, '"')
      .replace(/[‘’‛\u2018\u2019]/g, "'")
      .replace(/[^a-z0-9\s'"-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const splitIntoChunks = (text: string, size = 8000): string[] => {
      const chunks: string[] = []
      for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size))
      return chunks
    }

    // Try to reuse the reading pipeline's context builder for higher-quality chunks
    async function fetchReadingContextChunks(documentIds: string[]): Promise<string[]> {
      if (!Array.isArray(documentIds) || documentIds.length === 0) return []
      const base = req.nextUrl.origin
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || ''
      }
      const collected: string[] = []
      for (const docId of documentIds) {
        try {
          const res = await fetch(`${base}/api/reading/get-context`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              documentId: docId,
              options: { maxTokens: 8000, includeMetadata: true, chunkSize: 1200, overlap: 200, strategy: 'smart' }
            })
          })
          if (!res.ok) continue
          const data = await res.json()
          const cs = (data?.context?.chunks || []).map((c: any) => String(c?.content || '')).filter((s: string) => s.trim().length >= 40)
          collected.push(...cs)
        } catch {}
      }
      return collected
    }

    // Much more aggressive meta-question filtering
    const metaPattern = /(which\s+section|document\b|pdf\b|filename|table\s+of\s+contents|appendix|upload|processing|user\b|file\b|after\s+being\s+uploaded|primary\s+purpose\s+of\s+the\s+document|analyze|archived|deleted|printed|stored|saved|downloaded|drag\s+&?\s*drop|click\s+to\s+upload|choose\s+files|guidelines|status|extracted\s+content|processing\s+status)/i

    // Strict, section-based generation that requires an exact quote from the section
    const readingChunks = await fetchReadingContextChunks(body.documentIds || [])
    const rawSections = (readingChunks.length > 0 ? readingChunks : splitIntoChunks(combined, 8000))
    const sections = rawSections
      .map((s) => sanitizeSourceContent(s))
      .map((s) => {
        // Remove any lines that look like UI/upload boilerplate
        return s
          .split('\n')
          .filter(line => !/(drag\s+&?\s*drop|click\s+to\s+browse|choose\s+files|upload|processing|guidelines|status|file\s+(?:size|type|uploaded)|document\s+viewer)/i.test(line))
          .join('\n')
          .trim()
      })
      .filter(s => s && s.length > 100)
    
    console.log('📖 Sections for generation:', {
      readingChunksCount: readingChunks.length,
      totalSections: sections.length,
      firstSectionPreview: sections[0]?.slice(0, 500)
    })
    
    const normalizedSections = sections.map(c => normalize(c))
    const perChunkBase = Math.max(1, Math.floor(count / Math.max(1, sections.length)))
    let strictCollected: any[] = []

    for (let i = 0; i < sections.length && strictCollected.length < count; i++) {
      const remaining = count - strictCollected.length
      const ask = Math.min(5, Math.max(1, Math.min(perChunkBase, remaining)))
      try {
        const sectionPrompt = `From ONLY the section below, create EXACTLY ${ask} multiple-choice questions. Each question MUST:
- test a specific fact or concept from the section
- include four options (A-D) and one correct answer letter
- include an \"evidence\" field that is an exact short quote (<=120 chars) copied from the section that supports the correct answer

CRITICAL RULES:
- NEVER ask about "the document", "the file", "the PDF", or "after upload"
- NEVER ask what should be done with documents (analyze, delete, archive, print, store)
- ONLY ask about the actual subject matter/concepts/facts in the content below
- If the section is about functional architecture, ask about functional architecture
- If the section is about biology, ask about biology concepts
- Focus on testing knowledge OF the content, not ABOUT the content

Return strict JSON: {"questions":[{"id":"","type":"mcq","question":"","options":["","","",""],"correctAnswer":"A","explanation":"","topic":"","difficulty":"${difficulty}","evidence":""}]}

Section:\n${sections[i]}`

        const bySection = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are an exam question writer. Generate questions that test understanding of the subject matter in the provided text. NEVER create questions about documents, files, uploads, or storage. Focus ONLY on testing knowledge of the concepts and facts presented in the content.' },
            { role: 'user', content: sectionPrompt }
          ]
        })
        const secRaw = bySection.choices[0]?.message?.content || '{}'
        let secObj: any = {}
        try { secObj = JSON.parse(secRaw) } catch { const m = secRaw.match(/\{[\s\S]*\}/); secObj = m ? JSON.parse(m[0]) : { questions: [] } }
        const extra = (Array.isArray(secObj?.questions) ? secObj.questions : [])
          .filter((q: any) => q && Array.isArray(q.options))
          .filter((q: any) => !metaPattern.test(String(q.question || '')))
          .map((q: any, j: number) => {
            const cleanOption = (s: any) => String(s).replace(/^[A-D][).]\s*/i, '').trim()
            const opts = q.options.slice(0, 4).map((o: any) => cleanOption(o))
            const letter = String(q.correctAnswer || 'A').trim().toUpperCase().charAt(0)
            const validLetter = ['A','B','C','D'].includes(letter) ? letter : 'A'
            return {
              id: String(q.id || `sec_${i}_${j + 1}`),
              type: 'mcq',
              question: String(q.question || '').trim(),
              options: opts,
              correctAnswer: validLetter,
              explanation: String(q.explanation || ''),
              difficulty: String(q.difficulty || difficulty),
              topic: String(q.topic || ''),
              evidence: String((q as any).evidence || '')
            }
          })
          .filter((q: any) => {
            const ev = normalize(q.evidence || '').slice(0, 160)
            return ev.length >= 8 && normalizedSections[i].includes(ev)
          })
        strictCollected = [...strictCollected, ...extra].slice(0, count)
      } catch {}
    }

    // If strict pass already got the full requested amount, use them
    if (strictCollected.length >= count) {
      const exam = {
        examTitle: body.title || 'Practice Exam',
        instructions: body.instructions || 'Choose the best answer for each question.',
        duration: durationMinutes,
        questions: strictCollected.slice(0, count),
        quizMode: body.quizMode || 'rapid-fire'
      }
      return NextResponse.json({ success: true, exam })
    }

    // Simple, direct generation from document content (fallback)
    const systemPrompt = `You are an exam question generator. Your ONLY job is to create multiple-choice questions that test knowledge from the provided document content. 

CRITICAL RULES:
1. Every question MUST be about specific facts, concepts, or information found in the document
2. Do NOT create generic questions about "helping users" or "document processing"
3. Do NOT ask about the document itself (pages, sections, format)
4. Focus on the actual subject matter in the document (e.g., if it's about functional architecture, ask about functional architecture concepts)
5. Each question needs 4 options (A-D) with one correct answer
6. Return valid JSON only
7. Exactly ${count} questions are required. Do not produce more or fewer.`

    // Include sample questions in the prompt if available
    const sampleQuestionsText = sampleTexts.length > 0 
      ? `\n\nSAMPLE QUESTIONS FROM PROFESSOR (use these as style/topic reference):
${sampleTexts.map(text => sanitizeSourceContent(text)).join('\n\n---\n\n')}`
      : ''

    const userPrompt = `Generate EXACTLY ${count} multiple-choice questions based on the following document content. 
These questions should test understanding of the concepts and facts presented in this document.
Difficulty: ${difficulty}

IMPORTANT: The questions must be about the actual content below, not about generic topics.
${sampleQuestionsText ? 'Use the sample questions as a reference for question style, format, and topic coverage.' : ''}

Document Content:
${combined.slice(0, 50000)}${sampleQuestionsText}

Output format (strict JSON):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq", 
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": "${difficulty}"
    }
  ]
}`

    console.log('🎯 Generating questions with prompt length:', userPrompt.length)

    // Ask the model to create a clean MCQ-only exam
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.3,
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

    // Simple normalization without filtering
    const questions = Array.isArray(parsedExam?.questions) ? parsedExam.questions : []
    // Seed with any grounded strict questions already collected
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

    // Merge strictCollected first to preserve well-grounded items
    const mergedInitial = [...strictCollected, ...mappedQuestions].slice(0, count)

    let normalized = {
      examTitle: body.title || 'Practice Exam',
      instructions: body.instructions || 'Choose the best answer for each question.',
      duration: durationMinutes,
      questions: mergedInitial
    }

    // Simple top-up if we didn't get enough questions
    if (normalized.questions.length < count) {
      const missing = count - normalized.questions.length
      console.log(`📝 Need ${missing} more questions, making additional request...`)
      
      const topUpPrompt = `Generate EXACTLY ${missing} MORE multiple-choice questions based on the following document content.
These questions should test understanding of the concepts and facts presented in this document.
Difficulty: ${difficulty}

IMPORTANT: Create questions about the actual subject matter in the document, not generic topics.

Document Content:
${combined.slice(0, 50000)}

Output format (strict JSON):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": "${difficulty}"
    }
  ]
}`

      try {
        const topUp = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: topUpPrompt }
          ]
        })
        
        const topUpRaw = topUp.choices[0]?.message?.content || '{}'
        let topUpParsed: any = {}
        try { 
          topUpParsed = JSON.parse(topUpRaw) 
        } catch { 
          const m = topUpRaw.match(/\{[\s\S]*\}/)
          topUpParsed = m ? JSON.parse(m[0]) : { questions: [] } 
        }
        
        const extraQuestions = (Array.isArray(topUpParsed?.questions) ? topUpParsed.questions : [])
          .filter((q: any) => q && Array.isArray(q.options) && q.options.length >= 4)
          .map((q: any, i: number) => {
            const cleanOption = (s: any) => String(s).replace(/^[A-D][).]\s*/i, '').trim()
            const opts = q.options.slice(0, 4).map((o: any) => cleanOption(o))
            const letter = String(q.correctAnswer || 'A').trim().toUpperCase().charAt(0)
            const validLetter = ['A','B','C','D'].includes(letter) ? letter : 'A'
            return {
              id: String(q.id || `q_${normalized.questions.length + i + 1}`),
              type: 'mcq',
              question: String(q.question || '').trim(),
              options: opts,
              correctAnswer: validLetter,
              explanation: String(q.explanation || ''),
              difficulty: String(q.difficulty || difficulty),
              topic: String(q.topic || '')
            }
          })
        
        normalized = { 
          ...normalized, 
          questions: [...normalized.questions, ...extraQuestions].slice(0, count) 
        }
      } catch (error) {
        console.error('❌ Top-up failed:', error)
      }
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


