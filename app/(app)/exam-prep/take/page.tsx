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
  
  // Calculate progress based on time remaining
  const totalDurationSeconds = Math.max(1, Math.floor((exam.duration || 0) * 60))
  const pct = secondsLeft !== null 
    ? Math.min(100, Math.max(0, Math.round((secondsLeft / totalDurationSeconds) * 100)))
    : 100

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
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
              <div>
                <CardTitle className="tracking-tight text-white">{exam.examTitle}</CardTitle>
                <div className="text-sm text-white/80">Duration: {exam.duration} minutes</div>
              </div>
                <div className="flex items-center gap-4">
                  {secondsLeft !== null && (
                    <div className="text-2xl font-mono tabular-nums text-white font-bold">
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
          <CardContent className="space-y-6 p-8">
            {!finished ? (
              exam?.quizMode === 'scheduled' ? (
                // Scheduled Mode: Show all questions vertically
                <>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {Object.keys(answers).length} of {total} questions answered
                    </div>
                    <Button onClick={submitAll} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      Submit All
                    </Button>
                  </div>

                  <div className="border-t pt-6">
                    <div className="text-sm text-muted-foreground mb-4">Question {index + 1} of {total}</div>
                    <div className="text-xl font-semibold mb-6">{q?.question}</div>
                    <div className="grid grid-cols-1 gap-3">
                      {q?.options?.map((opt, i) => {
                        const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                        const value = `${label}`
                        const isSelected = selected === value
                        return (
                          <button
                            key={i}
                            onClick={() => setSelected(value)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50 shadow-md' 
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                            }`}
                          >
                            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${
                              isSelected 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {label}
                            </span>
                            <span className={`flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                              {opt}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                // Rapid Fire Mode: One question at a time
                <>
                  <div className="text-sm text-muted-foreground mb-4">Question {index + 1} of {total}</div>
                  <div className="text-xl font-semibold mb-6">{q?.question}</div>
                  <div className="grid grid-cols-1 gap-3">
                    {q?.options?.map((opt, i) => {
                      const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                      const value = `${label}`
                      const isSelected = selected === value
                      return (
                        <button
                          key={i}
                          onClick={() => setSelected(value)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                          }`}
                        >
                          <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {label}
                          </span>
                          <span className={`flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                            {opt}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {!showResult ? (
                    <div className="flex justify-end mt-6">
                      <Button 
                        disabled={!selected} 
                        onClick={submit} 
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold shadow-lg"
                      >
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
                      {q?.explanation && (
                        <div className="text-sm text-foreground leading-relaxed">Explanation: {q.explanation}</div>
                      )}
                      <div className="flex justify-end">
                        <Button onClick={next} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
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


