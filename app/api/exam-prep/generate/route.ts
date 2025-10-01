import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { openai, DEFAULT_MODEL } from '@/lib/openai'

export const runtime = 'nodejs'

type Difficulty = 'easy' | 'medium' | 'hard'

interface GenerateBody {
  // Either pass exam_files ids (from /api/exam-prep/upload) or reading_documents ids (from /api/reading/upload)
  fileIds?: string[]
  documentIds?: string[]
  count?: number
  durationMinutes?: number
  difficulty?: Difficulty
  title?: string
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
    .from('exam_files')
    .select('id, extracted_content')
    .in('id', fileIds)
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).map((r: { extracted_content?: string }) => (r.extracted_content || '')).filter(Boolean)
}

async function fetchTextsForReadingDocuments(supabase: any, docIds: string[], userId: string): Promise<string[]> {
  if (docIds.length === 0) return []
  const { data, error } = await supabase
    .from('reading_documents')
    .select('id, extracted_text')
    .in('id', docIds)
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).map((r: { extracted_text?: string }) => (r.extracted_text || '')).filter(Boolean)
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

    // Collect texts strictly from the user's own uploads
    const textsA = await fetchTextsForExamFiles(supabase, body.fileIds || [], user.id)
    const textsB = await fetchTextsForReadingDocuments(supabase, body.documentIds || [], user.id)
    const texts = [...textsA, ...textsB].filter(Boolean)
    if (texts.length === 0) {
      return NextResponse.json({ error: 'No extracted text available from uploaded documents' }, { status: 400 })
    }

    const combined = texts.join('\n\n---\n\n').slice(0, 120_000)

    // Detect whether the provided content looks like a sample exam
    const sampleDetect = detectSampleExamHeuristic(combined)

    const systemPrompt = sampleDetect.isSample
      ? 'You analyze sample exam questions and then create NEW multiple-choice questions that MIMIC their style, tone, and difficulty distribution. Do NOT copy questions verbatim. Keep MCQ format with 4 options (A-D). Use only topics/concepts present in the source. Never ask meta questions about the document (sections, pages, file names). Return ONLY strict JSON.'
      : 'You generate multiple-choice questions strictly from the provided study materials. Focus on the core concepts, facts, definitions, and relationships present in the text. Never ask meta questions about the document itself. Return ONLY strict JSON.'

    const userPrompt = sampleDetect.isSample
      ? `The source appears to contain sample exam questions (score=${sampleDetect.score}). Infer the common style (phrasing patterns, length, difficulty) and generate ${count} NEW MCQs in a similar style. Duration: ${durationMinutes} minutes. Title: ${body.title || 'Practice Exam (Modeled on Sample)'}\n\nSource (truncated):\n${combined}`
      : `Create a quiz of ${count} MCQs based ONLY on these materials. Difficulty: ${difficulty}. Duration: ${durationMinutes} minutes. Title: ${body.title || 'Practice Exam'}\n\nSource content (truncated):\n${combined}`

    // Ask the model to create a clean MCQ-only exam
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let exam
    try {
      exam = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      exam = match ? JSON.parse(match[0]) : { questions: [] }
    }

    // Normalize structure and drop meta questions
    const metaPattern = /(which\s+section|document|materials|pdf|filename|chapter\s+\d+|page\s+\d+|table\s+of\s+contents|appendix)/i
    const questions = Array.isArray(exam?.questions) ? exam.questions : []
    exam = {
      examTitle: String(exam?.examTitle || body.title || 'Practice Exam'),
      instructions: String(exam?.instructions || 'Choose the best answer for each question.'),
      duration: Number(exam?.duration || durationMinutes),
      questions: questions
        .filter((q: any) => q && Array.isArray(q.options))
        .filter((q: any) => !metaPattern.test(String(q.question || '')))
        .map((q: any, i: number) => ({
          id: String(q.id || `q_${i + 1}`),
            type: 'mcq',
          question: String(q.question || '').trim(),
          options: q.options.slice(0, 4).map((o: any) => String(o)),
          correctAnswer: String(q.correctAnswer || 'A'),
          explanation: String(q.explanation || ''),
          difficulty: (q.difficulty || difficulty),
          topic: String(q.topic || '')
        }))
        .slice(0, count)
    }

    return NextResponse.json({ success: true, exam })
  } catch (e: any) {
    console.error('Generate exam error:', e)
    return NextResponse.json({ error: 'Failed to generate exam', details: e?.message || String(e) }, { status: 500 })
  }
}


