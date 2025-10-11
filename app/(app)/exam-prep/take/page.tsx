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
  const pct = exam?.quizMode === 'scheduled'
    ? total > 0 ? Math.round((Object.keys(answers).length / total) * 100) : 0
    : total > 0 ? Math.round((index / total) * 100) : 0

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-xl border-t-4 border-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
              <div>
                <CardTitle className="tracking-tight text-white">{exam.examTitle}</CardTitle>
                <div className="text-sm text-blue-100">Duration: {exam.duration} minutes</div>
              </div>
                <div className="flex items-center gap-4">
                  {secondsLeft !== null && (
                    <div className="text-lg font-mono tabular-nums bg-white/20 px-3 py-1 rounded-lg">
                      {Math.max(0, Math.floor(secondsLeft / 60)).toString().padStart(2, '0')}
                      :
                      {Math.max(0, secondsLeft % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                  <Button variant="secondary" onClick={() => router.push('/exam-prep')}>Exit</Button>
                </div>
            </div>
            <div className="mt-4">
              <Progress value={pct} className="h-2 bg-blue-200" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!finished ? (
              exam?.quizMode === 'scheduled' ? (
                // Scheduled Mode: Show all questions vertically
                <>
                  <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4 border-b">
                    <div className="text-sm text-slate-600">
                      {Object.keys(answers).length} of {total} questions answered
                    </div>
                    <Button onClick={submitAll} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      Submit All
                    </Button>
                  </div>

                  {/* All Questions Displayed Vertically */}
                  <div className="space-y-8 pt-4">
                    {exam.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="text-sm font-semibold text-blue-600 mb-3">
                          Question {questionIndex + 1} of {total}
                        </div>
                        <div className="text-lg font-medium leading-relaxed mb-4">{question.question}</div>
                        <div className="grid grid-cols-1 gap-3">
                          {question.options?.map((opt, optIndex) => {
                            const label = ['A', 'B', 'C', 'D'][optIndex] || String(optIndex + 1)
                            const value = `${label}`
                            const isSelected = answers[questionIndex] === value
                            return (
                              <button
                                key={optIndex}
                                onClick={() => setAnswers(prev => ({ ...prev, [questionIndex]: value }))}
                                className={`w-full h-auto min-h-[3rem] py-3 px-4 rounded-lg border-2 text-left transition-all ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50 shadow-md'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                }`}
                              >
                                <span className="font-semibold text-blue-600 mr-3">{label}.</span>
                                <span>{opt}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                // Rapid Fire Mode: One question at a time
                <>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold my-4">
                    Question {index + 1} of {total}
                  </div>
                  <div className="text-lg font-medium leading-relaxed mb-6">{q?.question}</div>
                  <div className="grid grid-cols-1 gap-3">
                    {q?.options?.map((opt, i) => {
                      const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                      const value = `${label}`
                      return (
                        <button
                          key={i}
                          onClick={() => setSelected(value)}
                          className={`w-full h-auto min-h-[3rem] py-3 px-4 rounded-lg border-2 text-left transition-all ${
                            selected === value
                              ? 'border-purple-600 bg-purple-50 shadow-md'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-semibold text-purple-600 mr-3">{label}.</span>
                          <span>{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {!showResult ? (
                    <div className="flex justify-end">
                      <Button disabled={!selected} onClick={submit} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        Submit
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-lg ${selected.toUpperCase().startsWith(String(q?.correctAnswer || '').toUpperCase()) ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <div className="font-semibold">
                          {selected.toUpperCase().startsWith(String(q?.correctAnswer || '').toUpperCase()) ? '✓ Correct!' : `✗ Incorrect. Answer: ${q?.correctAnswer}`}
                        </div>
                        {q?.explanation && (
                          <div className="text-sm mt-2 leading-relaxed">Explanation: {q.explanation}</div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={next} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="text-center py-10">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-6 px-8 rounded-xl shadow-lg mb-6">
                  <div className="text-3xl font-bold mb-2">🎉 Finished!</div>
                  <div className="text-2xl">Score: {score} / {total}</div>
                  <div className="text-lg mt-2 opacity-90">
                    {Math.round((score / total) * 100)}% correct
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" className="border-2" onClick={() => {
                    setIndex(0);
                    setScore(0);
                    setShowResult(false);
                    setSelected('');
                    setAnswers({});
                  }}>Retry</Button>
                  <Button onClick={() => router.push('/exam-prep')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Back to Exam Prep
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


