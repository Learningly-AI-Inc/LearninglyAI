"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

interface ExamData {
  examTitle: string
  instructions: string
  duration: number
  questions: Question[]
}

export default function TakeExamPage() {
  const router = useRouter()
  const [exam, setExam] = useState<ExamData | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string>('')
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('generatedExam')
      if (!raw) return
      const parsed = JSON.parse(raw) as ExamData
      setExam(parsed)
    } catch {}
  }, [])

  const q = useMemo(() => exam?.questions?.[index], [exam, index])

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">No exam loaded. Generate one first.</div>
      </div>
    )
  }

  const total = exam.questions.length || 1
  const pct = Math.round((index / total) * 100)

  function submit() {
    if (!q || !selected) return
    const isCorrect = selected.trim().toUpperCase().startsWith(String(q.correctAnswer).trim().toUpperCase())
    if (isCorrect) setScore(s => s + 1)
    setShowResult(true)
  }

  function next() {
    setShowResult(false)
    setSelected('')
    if (index + 1 >= total) return
    setIndex(i => i + 1)
  }

  const finished = index + 1 >= total && showResult

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{exam.examTitle}</CardTitle>
                <div className="text-sm text-slate-600">Duration: {exam.duration} minutes</div>
              </div>
              <Button variant="outline" onClick={() => router.push('/exam-prep')}>Exit</Button>
            </div>
            <div className="mt-4">
              <Progress value={pct} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!finished ? (
              <>
                <div className="text-lg font-medium">Question {index + 1} of {total}</div>
                <div className="text-base">{q?.question}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q?.options?.map((opt, i) => {
                    const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                    const value = `${label}`
                    return (
                      <Button key={i} variant={selected === value ? 'default' : 'outline'} onClick={() => setSelected(value)} className="justify-start">
                        <span className="mr-2 font-semibold">{label}.</span> {opt}
                      </Button>
                    )
                  })}
                </div>

                {!showResult ? (
                  <div className="flex justify-end">
                    <Button disabled={!selected} onClick={submit}>Submit</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={selected.toUpperCase().startsWith(String(q?.correctAnswer || '').toUpperCase()) ? 'text-green-700' : 'text-red-700'}>
                      {selected.toUpperCase().startsWith(String(q?.correctAnswer || '').toUpperCase()) ? 'Correct!' : `Incorrect. Answer: ${q?.correctAnswer}`}
                    </div>
                    {q?.explanation && (
                      <div className="text-sm text-slate-700">Explanation: {q.explanation}</div>
                    )}
                    <div className="flex justify-end">
                      <Button onClick={next}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10">
                <div className="text-2xl font-semibold mb-2">Finished!</div>
                <div className="text-lg mb-6">Score: {score} / {total}</div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => { setIndex(0); setScore(0); setShowResult(false); setSelected('') }}>Retry</Button>
                  <Button onClick={() => router.push('/exam-prep')}>Back to Exam Prep</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


