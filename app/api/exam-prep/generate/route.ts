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
  instructions?: string
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

    // Collect texts strictly from the user's own uploads
    const textsA = await fetchTextsForExamFiles(supabase, body.fileIds || [], user.id)
    const textsB = await fetchTextsForReadingDocuments(supabase, body.documentIds || [], user.id)
    const texts = [...textsA, ...textsB].filter(Boolean)
    if (texts.length === 0) {
      return NextResponse.json({ error: 'No extracted text available from uploaded documents' }, { status: 400 })
    }

    // Sanitize each document separately; drop boilerplate-only docs
    const sanitizedDocs = texts
      .map(t => sanitizeSourceContent(t))
      .filter(t => typeof t === 'string' && t.trim().length >= 200)
    const sourceDocs = sanitizedDocs.length > 0 ? sanitizedDocs : texts
    const rawCombined = sourceDocs.join('\n\n---\n\n').slice(0, 100_000)
    const combined = rawCombined

    // Normalization helpers for grounding checks
    const normalizeForEvidence = (s: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/[“”„‟‶\u201C\u201D]/g, '"')
        .replace(/[‘’‛\u2018\u2019]/g, "'")
        .replace(/[^a-z0-9\s'"-]+/g, ' ') // keep alphanum and simple quotes/hyphens
        .replace(/\s+/g, ' ')
        .trim()

    const normalizedSource = normalizeForEvidence(combined)

    const STOPWORDS = new Set([
      'the','a','an','and','or','but','of','to','in','on','for','with','by','as','is','are','was','were','be','being','been','at','from','that','this','these','those','it','its','their','there','which','who','whom','what','when','where','why','how','into','than','then','so','such','may','can','could','would','should'
    ])

    const evidenceAppearsInSource = (evidence: string): boolean => {
      const ev = normalizeForEvidence(evidence).slice(0, 160)
      if (ev.length < 12) return false
      return normalizedSource.includes(ev)
    }

    const hasSufficientKeywordOverlap = (text: string): boolean => {
      const tokens = normalizeForEvidence(text).split(' ').filter(t => t.length >= 4 && !STOPWORDS.has(t))
      if (tokens.length === 0) return false
      const unique = Array.from(new Set(tokens))
      const present = unique.filter(t => normalizedSource.includes(t))
      // Softer threshold: at least 2 meaningful terms and 30% presence
      return present.length >= Math.min(2, unique.length) && (present.length / unique.length) >= 0.3
    }

    // Build a concept inventory first to anchor generation to actual content
    let conceptsJson: any = { concepts: [] }
    try {
      const conceptsCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Extract the core concepts and facts from study materials for exam creation. Return strict JSON.' },
          { role: 'user', content: `From the materials below, identify up to 30 key concepts or facts that can be used to write exam questions. For each, include a one-sentence description and an exact short supporting quote (<=120 chars) copied from the text. Output JSON shape: {"concepts":[{"name":"","description":"","quote":""}]}.\n\nMaterials (truncated):\n${combined}` }
        ]
      })
      const cj = conceptsCompletion.choices[0]?.message?.content || '{}'
      conceptsJson = JSON.parse(cj)
      if (!Array.isArray(conceptsJson?.concepts)) conceptsJson = { concepts: [] }
    } catch {}

    // Detect whether the provided content looks like a sample exam
    const sampleDetect = detectSampleExamHeuristic(combined)

    const systemPrompt = sampleDetect.isSample
      ? 'You analyze sample exam questions and then create NEW multiple-choice questions that MIMIC their style, tone, and difficulty distribution. Do NOT copy questions verbatim. Keep MCQ format with 4 options (A-D). Use only topics/concepts present in the source. Never ask meta questions about the document (sections, pages, file names). For each question, include an "evidence" field: a short exact quote (<=120 chars) taken from the source text that supports the answer. If evidence cannot be quoted from the source, SKIP that question. Return ONLY strict JSON.'
      : 'You generate multiple-choice questions strictly from the provided study materials. Focus on the core concepts, facts, definitions, and relationships present in the text. Never ask meta questions about the document itself. For each question, include an "evidence" field: a short exact quote (<=120 chars) taken from the source text that supports the answer. If evidence cannot be quoted from the source, SKIP that question. Return ONLY strict JSON.'

    const addl = body.instructions ? `Additional instructions: ${body.instructions}\n` : ''
    const userPrompt = sampleDetect.isSample
      ? `The source appears to contain sample exam questions (score=${sampleDetect.score}). Infer the common style (phrasing patterns, length, difficulty) and generate EXACTLY ${count} NEW MCQs in a similar style. Duration: ${durationMinutes} minutes. Title: ${body.title || 'Practice Exam (Modeled on Sample)'}\n${addl}\nSTRICT OUTPUT SHAPE:\n{"questions":[{"id":"","type":"mcq","question":"","options":["","","",""],"correctAnswer":"A","explanation":"","topic":"","difficulty":"${difficulty}","evidence":""}]}\n\nSource (truncated):\n${combined}`
      : `Create EXACTLY ${count} MCQs based ONLY on these materials. Difficulty: ${difficulty}. Duration: ${durationMinutes} minutes. Title: ${body.title || 'Practice Exam'}\n${addl}\nSTRICT OUTPUT SHAPE:\n{"questions":[{"id":"","type":"mcq","question":"","options":["","","",""],"correctAnswer":"A","explanation":"","topic":"","difficulty":"${difficulty}","evidence":""}]}\n\nSource content (truncated):\n${combined}`

    // Ask the model to create a clean MCQ-only exam
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Concept inventory for grounding:\n${JSON.stringify(conceptsJson).slice(0, 8000)}` },
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

    // Normalize structure and drop meta questions
    const metaPattern = /(which\s+section|document\b|materials|pdf|filename|chapter\s+\d+|page\s+\d+|table\s+of\s+contents|appendix)/i
    const questions = Array.isArray(parsedExam?.questions) ? parsedExam.questions : []
    // Map raw questions first (without strict grounding) so we have a safe fallback
    const initialMapped = questions
      .filter((q: any) => q && Array.isArray(q.options))
      .filter((q: any) => !metaPattern.test(String(q.question || '')))
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
          difficulty: (q.difficulty || difficulty),
          topic: String(q.topic || ''),
          evidence: String((q as any).evidence || '')
        }
      })

    // Apply strict grounding to the mapped questions
    const strictlyGrounded = initialMapped
      .filter((q: any) => {
        const evidenceOk = q.evidence ? evidenceAppearsInSource(q.evidence) : false
        const overlapOk = hasSufficientKeywordOverlap(
          `${q.question} ${Array.isArray(q.options) ? q.options.join(' ') : ''}`
        )
        return evidenceOk || overlapOk
      })

    let normalized = {
      examTitle: String(parsedExam?.examTitle || body.title || 'Practice Exam'),
      instructions: String(parsedExam?.instructions || 'Choose the best answer for each question.'),
      duration: Number(parsedExam?.duration || durationMinutes),
      questions: strictlyGrounded.slice(0, count)
    }

    // If model returned fewer than requested, top up with another call asking for the remainder.
    let attempts = 0
    while (normalized.questions.length < count && attempts < 3) {
      attempts += 1
      try {
        const missing = count - normalized.questions.length
        const usedStems = normalized.questions.map((q: any) => String(q.question || '').slice(0, 140))
        const topUpUserPrompt = `Create EXACTLY ${missing} additional MCQs grounded ONLY in the materials below. Do not repeat or paraphrase any of these existing question stems:\n- ${usedStems.join('\n- ')}\nEach question MUST include an \"evidence\" field that is an exact quote (<=120 chars) present in the materials. If you cannot quote evidence, SKIP that question.\nSTRICT OUTPUT SHAPE:\n{"questions":[{"id":"","type":"mcq","question":"","options":["","","",""],"correctAnswer":"A","explanation":"","topic":"","difficulty":"${difficulty}","evidence":""}]}\n\nMaterials (truncated):\n${combined}`
        const topUp = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'system', content: `Concept inventory for grounding:\n${JSON.stringify(conceptsJson).slice(0, 8000)}` },
            { role: 'user', content: topUpUserPrompt }
          ]
        })
        const topRaw = topUp.choices[0]?.message?.content || '{}'
        let topObj: any = {}
        try { topObj = JSON.parse(topRaw) } catch { const m = topRaw.match(/\{[\s\S]*\}/); topObj = m ? JSON.parse(m[0]) : { questions: [] } }
        const extra = (Array.isArray(topObj?.questions) ? topObj.questions : [])
          .filter((q: any) => q && Array.isArray(q.options))
          .filter((q: any) => !metaPattern.test(String(q.question || '')))
          .map((q: any, i: number) => {
            const cleanOption = (s: any) => String(s).replace(/^[A-D][).]\s*/i, '').trim()
            const opts = q.options.slice(0, 4).map((o: any) => cleanOption(o))
            const letter = String(q.correctAnswer || 'A').trim().toUpperCase().charAt(0)
            const validLetter = ['A','B','C','D'].includes(letter) ? letter : 'A'
            return {
              id: String(q.id || `q_extra_${attempts}_${i + 1}`),
              type: 'mcq',
              question: String(q.question || '').trim(),
              options: opts,
              correctAnswer: validLetter,
              explanation: String(q.explanation || ''),
              difficulty: (q.difficulty || difficulty),
              topic: String(q.topic || ''),
              evidence: String((q as any).evidence || '')
            }
          })
          .filter((q: any) => {
            const evidenceOk = q.evidence ? evidenceAppearsInSource(q.evidence) : false
            const overlapOk = hasSufficientKeywordOverlap(
              `${q.question} ${Array.isArray(q.options) ? q.options.join(' ') : ''}`
            )
            return evidenceOk || overlapOk
          })
        normalized = { ...normalized, questions: [...normalized.questions, ...extra].slice(0, count) }
      } catch {}
    }

    // Final relaxation: if still short, do one last pass allowing optional evidence but enforcing keyword overlap
    if (normalized.questions.length < count) {
      try {
        const missing = count - normalized.questions.length
        const lastPrompt = `Create EXACTLY ${missing} additional MCQs strictly and directly based on the materials. If you include an evidence field, it must be an exact quote from the materials; otherwise you may leave it blank. STRICT OUTPUT SHAPE:\n{"questions":[{"id":"","type":"mcq","question":"","options":["","","",""],"correctAnswer":"A","explanation":"","topic":"","difficulty":"${difficulty}","evidence":""}]}\n\nMaterials (truncated):\n${combined}`
        const final = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'system', content: `Concept inventory for grounding:\n${JSON.stringify(conceptsJson).slice(0, 8000)}` },
            { role: 'user', content: lastPrompt }
          ]
        })
        const finalRaw = final.choices[0]?.message?.content || '{}'
        let finalObj: any = {}
        try { finalObj = JSON.parse(finalRaw) } catch { const m = finalRaw.match(/\{[\s\S]*\}/); finalObj = m ? JSON.parse(m[0]) : { questions: [] } }
        const extra = (Array.isArray(finalObj?.questions) ? finalObj.questions : [])
          .filter((q: any) => q && Array.isArray(q.options))
          .filter((q: any) => !metaPattern.test(String(q.question || '')))
          .map((q: any, i: number) => {
            const cleanOption = (s: any) => String(s).replace(/^[A-D][).]\s*/i, '').trim()
            const opts = q.options.slice(0, 4).map((o: any) => cleanOption(o))
            const letter = String(q.correctAnswer || 'A').trim().toUpperCase().charAt(0)
            const validLetter = ['A','B','C','D'].includes(letter) ? letter : 'A'
            return {
              id: String(q.id || `q_relax_${i + 1}`),
              type: 'mcq',
              question: String(q.question || '').trim(),
              options: opts,
              correctAnswer: validLetter,
              explanation: String(q.explanation || ''),
              difficulty: (q.difficulty || difficulty),
              topic: String(q.topic || ''),
              evidence: String((q as any).evidence || '')
            }
          })
          .filter((q: any) => hasSufficientKeywordOverlap(`${q.question} ${Array.isArray(q.options) ? q.options.join(' ') : ''}`))
        normalized = { ...normalized, questions: [...normalized.questions, ...extra].slice(0, count) }
      } catch {}
    }

    // Absolute fallback: if nothing survived grounding, use the initial mapped (non-meta) items
    if (normalized.questions.length === 0 && initialMapped.length > 0) {
      normalized = { ...normalized, questions: initialMapped.slice(0, count) }
    }

    // Last-chance top-up: if still short, generate the remaining without strict evidence requirement
    if (normalized.questions.length < count) {
      try {
        const missing = count - normalized.questions.length
        const blueprintPrompt = `Create EXACTLY ${missing} additional multiple-choice questions grounded in the concepts and materials below. Each question must have 4 options (A-D) and a single correct letter. Difficulty: ${difficulty}. Keep questions focused on the concepts; avoid meta questions about the document. STRICT JSON OUTPUT:\n{"questions":[{"id":"","type":"mcq","question":"","options":["","","",""],"correctAnswer":"A","explanation":"","topic":"","difficulty":"${difficulty}","evidence":""}]}`
        const last = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.4,
          messages: [
            { role: 'system', content: 'You write high-quality exam questions strictly based on provided materials and concept inventory.' },
            { role: 'system', content: `Concept inventory for grounding:\n${JSON.stringify(conceptsJson).slice(0, 8000)}` },
            { role: 'user', content: `${blueprintPrompt}\n\nMaterials (truncated):\n${combined}` }
          ]
        })
        const jr = last.choices[0]?.message?.content || '{}'
        let jobj: any = {}
        try { jobj = JSON.parse(jr) } catch { const m = jr.match(/\{[\s\S]*\}/); jobj = m ? JSON.parse(m[0]) : { questions: [] } }
        const extra = (Array.isArray(jobj?.questions) ? jobj.questions : [])
          .filter((q: any) => q && Array.isArray(q.options))
          .map((q: any, i: number) => {
            const cleanOption = (s: any) => String(s).replace(/^[A-D][).]\s*/i, '').trim()
            const opts = q.options.slice(0, 4).map((o: any) => cleanOption(o))
            const letter = String(q.correctAnswer || 'A').trim().toUpperCase().charAt(0)
            const validLetter = ['A','B','C','D'].includes(letter) ? letter : 'A'
            return {
              id: String(q.id || `q_last_${i + 1}`),
              type: 'mcq',
              question: String(q.question || '').trim(),
              options: opts,
              correctAnswer: validLetter,
              explanation: String(q.explanation || ''),
              difficulty: (q.difficulty || difficulty),
              topic: String(q.topic || ''),
              evidence: String((q as any).evidence || '')
            }
          })
        normalized = { ...normalized, questions: [...normalized.questions, ...extra].slice(0, count) }
      } catch {}
    }

    const exam = { ...normalized, instructions: body.instructions || normalized.instructions }

    return NextResponse.json({ success: true, exam })
  } catch (e: any) {
    console.error('Generate exam error:', e)
    return NextResponse.json({ error: 'Failed to generate exam', details: e?.message || String(e) }, { status: 500 })
  }
}


