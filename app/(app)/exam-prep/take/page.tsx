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
  const [showReview, setShowReview] = useState(false)
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isExamComplete, setIsExamComplete] = useState(false)
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

  // Check if a specific answer is correct
  const isAnswerCorrect = useCallback((questionIndex: number) => {
    if (!exam) return false
    const question = exam.questions[questionIndex]
    const userAnswer = answers[questionIndex]
    if (!userAnswer || !question) return false
    return userAnswer.trim().toUpperCase().startsWith(String(question.correctAnswer).trim().toUpperCase())
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
    
    // Store the answer
    setAnswers(prev => ({ ...prev, [index]: selected }))
    
    // In rapid fire mode, show feedback instead of finishing the exam
    if (exam?.quizMode === 'rapid-fire') {
      setShowFeedback(true)
    } else {
      setShowResult(true)
    }
  }

  function submitAll() {
    if (!exam) return
    const finalScore = calculateScore()
    setScore(finalScore)
    setShowResult(true)
  }

  function next() {
    setShowResult(false)
    setShowFeedback(false)
    setSelected('')
    
    // Check if we've reached the last question
    if (index + 1 >= total) {
      // Exam is complete, show final results
      setIsExamComplete(true)
      setShowResult(true)
      return
    }
    
    // Move to next question
    setIndex(i => i + 1)
  }

  const timeUp = secondsLeft !== null && secondsLeft <= 0
  const finished = timeUp || showResult

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-xl border-0 overflow-hidden dark:bg-gray-900 dark:border dark:border-gray-800">
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
              <Progress value={pct} className="h-2 bg-blue-200 dark:bg-blue-950" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-8 dark:bg-gray-900">
            {!finished ? (
              exam?.quizMode === 'scheduled' ? (
                // Scheduled Mode: Show all questions vertically
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-muted-foreground">
                      {Object.keys(answers).length} of {total} questions answered
                    </div>
                    <Button onClick={submitAll} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      Submit All
                    </Button>
                  </div>

                  <div className="space-y-8">
                    {exam.questions.map((question, questionIndex) => {
                      const currentAnswer = answers[questionIndex] || ''
                      return (
                        <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                          <div className="text-sm text-muted-foreground mb-4">Question {questionIndex + 1} of {total}</div>
                          <div className="text-xl font-semibold mb-6">{question.question}</div>
                          <div className="grid grid-cols-1 gap-3">
                            {question.options.map((opt, i) => {
                              const label = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                              const value = `${label}`
                              const isSelected = currentAnswer === value
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setAnswers(prev => ({ ...prev, [questionIndex]: value }))
                                  }}
                                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600 shadow-md' 
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:shadow-sm'
                                  }`}
                                >
                                  <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${
                                    isSelected 
                                      ? 'bg-blue-600 text-white' 
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {label}
                                  </span>
                                  <span className={`flex-1 ${isSelected ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {opt}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
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
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600 shadow-md' 
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:shadow-sm'
                          }`}
                        >
                          <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {label}
                          </span>
                          <span className={`flex-1 ${isSelected ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                            {opt}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {!showFeedback && !showResult ? (
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
                  ) : showFeedback ? (
                    <div className="space-y-4 mt-6">
                      <div className={`p-4 rounded-lg ${selected.toUpperCase().startsWith(String(q?.correctAnswer || '').toUpperCase()) ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                        <div className="font-semibold">
                          {selected.toUpperCase().startsWith(String(q?.correctAnswer || '').toUpperCase()) ? '✓ Correct!' : `✗ Incorrect. The correct answer is: ${q?.correctAnswer}`}
                        </div>
                        {q?.explanation && (
                          <div className="text-sm mt-2 leading-relaxed">Explanation: {q.explanation}</div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={next} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                          {index + 1 >= total ? 'Finish Exam' : 'Next Question'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )
            ) : showReview ? (
              <div className="py-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Review Answers</h2>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showOnlyIncorrect}
                        onChange={(e) => setShowOnlyIncorrect(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Show only incorrect answers
                    </label>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowReview(false)}
                      className="flex items-center gap-2"
                    >
                      ← Back to Results
                    </Button>
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 px-6 rounded-xl shadow-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">Exam Summary</div>
                      <div className="text-sm opacity-90">
                        {score} correct out of {total} questions ({Math.round((score / total) * 100)}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{score}/{total}</div>
                      <div className="text-sm opacity-90">Score</div>
                    </div>
                  </div>
                </div>
                
                {/* Filter Info */}
                {showOnlyIncorrect && (
                  <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      Showing {exam.questions.filter((_, i) => !isAnswerCorrect(i)).length} incorrect answers out of {total} total questions
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  {exam.questions
                    .map((question, questionIndex) => ({ question, questionIndex }))
                    .filter(({ questionIndex }) => !showOnlyIncorrect || !isAnswerCorrect(questionIndex))
                    .map(({ question, questionIndex }) => {
                    const userAnswer = answers[questionIndex] || 'Not answered'
                    const isCorrect = isAnswerCorrect(questionIndex)
                    const correctAnswer = question.correctAnswer
                    
                    return (
                      <Card key={questionIndex} className={`border-2 ${isCorrect ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-950/30' : 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg font-semibold text-foreground">
                              Question {questionIndex + 1}
                            </CardTitle>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isCorrect 
                                ? 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100' 
                                : 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100'
                            }`}>
                              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-foreground font-medium">
                            {question.question}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Your Answer:</div>
                            <div className={`p-3 rounded-lg border ${
                              isCorrect 
                                ? 'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/50 dark:border-green-600 dark:text-green-100' 
                                : 'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/50 dark:border-red-600 dark:text-red-100'
                            }`}>
                              {userAnswer}
                            </div>
                          </div>
                          
                          {!isCorrect && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">Correct Answer:</div>
                              <div className="p-3 rounded-lg bg-green-100 border border-green-300 text-green-900 dark:bg-green-900/50 dark:border-green-600 dark:text-green-100">
                                {correctAnswer}
                              </div>
                            </div>
                          )}
                          
                          {question.explanation && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">Explanation:</div>
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-100">
                                {question.explanation}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
                
                <div className="flex gap-3 justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIndex(0);
                      setScore(0);
                      setShowResult(false);
                      setShowReview(false);
                      setShowFeedback(false);
                      setIsExamComplete(false);
                      setSelected('');
                      setAnswers({});
                    }}
                    className="border-2"
                  >
                    Retry Exam
                  </Button>
                  <Button 
                    onClick={() => router.push('/exam-prep')} 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Back to Exam Prep
                  </Button>
                </div>
              </div>
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
                  <Button 
                    variant="outline" 
                    className="border-2" 
                    onClick={() => setShowReview(true)}
                  >
                    Review Answers
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-2" 
                    onClick={() => {
                      setIndex(0);
                      setScore(0);
                      setShowResult(false);
                      setShowFeedback(false);
                      setIsExamComplete(false);
                      setSelected('');
                      setAnswers({});
                    }}
                  >
                    Retry
                  </Button>
                  <Button 
                    onClick={() => router.push('/exam-prep')} 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
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


