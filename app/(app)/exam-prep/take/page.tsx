"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  quizMode?: 'rapid-fire' | 'scheduled'
}

export default function TakeExamPage() {
  const router = useRouter()
  const [exam, setExam] = useState<ExamData | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string>('')
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('generatedExam')
      if (!raw) return
      const parsed = JSON.parse(raw) as ExamData
      setExam(parsed)
      const durationSeconds = Math.max(1, Math.floor((parsed.duration || 0) * 60))
      setSecondsLeft(durationSeconds)
    } catch {}
  }, [])

  // Countdown timer that persists during the session
  useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft <= 0) {
      setShowResult(true)
      return
    }
    timerRef.current && clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000)
    return () => { timerRef.current && clearTimeout(timerRef.current) }
  }, [secondsLeft])

  const q = useMemo(() => exam?.questions?.[index], [exam, index])

  // Calculate score from all answers (for scheduled mode)
  const calculateScore = useCallback(() => {
    if (!exam) return 0
    let correctCount = 0
    exam.questions.forEach((question, i) => {
      const userAnswer = answers[i]
      if (userAnswer && userAnswer.trim().toUpperCase().startsWith(String(question.correctAnswer).trim().toUpperCase())) {
        correctCount++
      }
    })
    return correctCount
  }, [exam, answers])

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">No exam loaded. Generate one first.</div>
      </div>
    )
  }

  if (exam.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">No questions were generated from your documents. Please try again with clearer materials.</div>
      </div>
    )
  }

  const total = Math.max(0, exam.questions.length || 0)
  const pct = total > 0 ? Math.round((index / total) * 100) : 0

  function submit() {
    if (!q || !selected) return
    const isCorrect = selected.trim().toUpperCase().startsWith(String(q.correctAnswer).trim().toUpperCase())
    if (isCorrect) setScore(s => s + 1)
    
    // Store answer for scheduled mode
    if (exam?.quizMode === 'scheduled') {
      setAnswers(prev => ({ ...prev, [index]: selected }))
    }
    
    setShowResult(true)
  }

  function submitAll() {
    if (!exam) return
    const finalScore = calculateScore()
    setScore(finalScore)
    setShowResult(true)
  }

  function next() {
    setShowResult(false)
    if (exam?.quizMode === 'scheduled') {
      setAnswers(prev => ({ ...prev, [index]: selected }))
    }
    setSelected('')
    if (index + 1 >= total) return
    setIndex(i => i + 1)
  }

  function goToQuestion(questionIndex: number) {
    setShowResult(false)
    if (exam?.quizMode === 'scheduled') {
      setAnswers(prev => ({ ...prev, [index]: selected }))
    }
    setSelected(answers[questionIndex] || '')
    setIndex(questionIndex)
  }

  const timeUp = secondsLeft !== null && secondsLeft <= 0
  const finished = timeUp || (exam?.quizMode === 'scheduled' ? showResult : (index + 1 >= total && showResult))

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
              <div className="flex items-center justify-between">
              <div>
                <CardTitle className="tracking-tight">{exam.examTitle}</CardTitle>
                <div className="text-sm text-muted-foreground">Duration: {exam.duration} minutes</div>
              </div>
                <div className="flex items-center gap-4">
                  {secondsLeft !== null && (
                    <div className="text-sm font-mono tabular-nums text-foreground">
                      {Math.max(0, Math.floor(secondsLeft / 60)).toString().padStart(2, '0')}
                      :
                      {Math.max(0, secondsLeft % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                  <Button variant="outline" onClick={() => router.push('/exam-prep')}>Exit</Button>
                </div>
            </div>
            <div className="mt-4">
              <Progress value={pct} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!finished ? (
              exam?.quizMode === 'scheduled' ? (
                // Scheduled Mode: Show all questions
                <>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {Object.keys(answers).length} of {total} questions answered
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={submitAll}>
                        Submit All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Question Navigation */}
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {exam.questions.map((_, i) => (
                      <Button
                        key={i}
                        variant={i === index ? "default" : answers[i] ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => goToQuestion(i)}
                        className="aspect-square"
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>

                  <div className="border-t pt-6">
                    <div className="text-sm text-muted-foreground mb-4">Question {index + 1} of {total}</div>
                    <div className="text-base leading-relaxed mb-6">{q?.question}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q?.options?.map((opt, i) => {
                        const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                        const value = `${label}`
                        return (
                          <Button
                            key={i}
                            variant={selected === value ? 'default' : 'outline'}
                            onClick={() => setSelected(value)}
                            className={`w-full h-auto min-h-[3rem] py-3 justify-start items-start text-left whitespace-normal break-words text-wrap leading-snug ${selected === value ? '' : 'hover:bg-accent'}`}
                          >
                            <span className="mr-3 font-semibold shrink-0">{label}.</span>
                            <span className="flex-1 break-words">{opt}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                // Rapid Fire Mode: One question at a time
                <>
                  <div className="text-sm text-muted-foreground">Question {index + 1} of {total}</div>
                  <div className="text-base leading-relaxed">{q?.question}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q?.options?.map((opt, i) => {
                      const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                      const value = `${label}`
                      return (
                        <Button
                          key={i}
                          variant={selected === value ? 'default' : 'outline'}
                          onClick={() => setSelected(value)}
                          className={`w-full h-auto min-h-[3rem] py-3 justify-start items-start text-left whitespace-normal break-words text-wrap leading-snug ${selected === value ? '' : 'hover:bg-accent'}`}
                        >
                          <span className="mr-3 font-semibold shrink-0">{label}.</span>
                          <span className="flex-1 break-words">{opt}</span>
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
                        <div className="text-sm text-foreground leading-relaxed">Explanation: {q.explanation}</div>
                      )}
                      <div className="flex justify-end">
                        <Button onClick={next}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="text-center py-10">
                <div className="text-2xl font-semibold mb-2">Finished!</div>
                <div className="text-lg mb-6">Score: {score} / {total}</div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => { 
                    setIndex(0); 
                    setScore(0); 
                    setShowResult(false); 
                    setSelected(''); 
                    setAnswers({});
                  }}>Retry</Button>
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


