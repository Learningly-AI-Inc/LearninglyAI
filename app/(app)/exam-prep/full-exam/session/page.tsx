"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AnimatedContent, FadeContent } from "@/components/react-bits";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Flag,
  Trophy
} from "lucide-react";

interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface ExamData {
  examTitle: string;
  instructions: string;
  duration: number;
  questions: ExamQuestion[];
}

interface UserAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect?: boolean;
  timeSpent?: number;
}

export default function ExamSessionPage() {
  const router = useRouter();
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load exam data from localStorage
    const storedExam = localStorage.getItem('generatedExam');
    if (storedExam) {
      try {
        const parsedExam = JSON.parse(storedExam);
        // Handle both single exam and multiple exams format
        let examToUse;
        if (parsedExam.exam) {
          // Single exam format (legacy)
          examToUse = parsedExam.exam;
        } else if (parsedExam.exams && parsedExam.exams.length > 0) {
          // Multiple exams format - use first full-length exam
          examToUse = parsedExam.exams.find((exam: any) => exam.examType === 'full-length') || parsedExam.exams[0];
        } else {
          throw new Error('Invalid exam data format');
        }
        
        setExamData(examToUse);
        setTimeLeft(examToUse.duration * 60); // Convert minutes to seconds
      } catch (error) {
        console.error('Failed to load exam data:', error);
        router.push('/exam-prep/full-exam');
      }
    } else {
      router.push('/exam-prep/full-exam');
    }
  }, [router]);

  useEffect(() => {
    if (isExamStarted && !isExamCompleted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isExamStarted, isExamCompleted, timeLeft]);

  const startExam = () => {
    setIsExamStarted(true);
    setQuestionStartTime(Date.now());
  };

  const handleAnswerSelect = (answer: string) => {
    if (isExamCompleted) return;

    const currentQuestion = examData?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const timeSpent = Date.now() - questionStartTime;
    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: answer,
      timeSpent: timeSpent
    };

    setUserAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(currentQuestion.id, userAnswer);
      return newAnswers;
    });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (examData?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
      setQuestionStartTime(Date.now());
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (examData?.questions.length || 0) - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleSubmitExam = () => {
    setIsExamCompleted(true);
    
    // Calculate results
    const results = new Map(userAnswers);
    examData?.questions.forEach(question => {
      const userAnswer = results.get(question.id);
      if (userAnswer) {
        userAnswer.isCorrect = userAnswer.selectedAnswer === question.correctAnswer;
        results.set(question.id, userAnswer);
      }
    });
    
    setUserAnswers(results);
    setShowResults(true);
  };

  const getScore = () => {
    const totalQuestions = examData?.questions.length || 0;
    const correctAnswers = Array.from(userAnswers.values()).filter(answer => answer.isCorrect).length;
    return { correct: correctAnswers, total: totalQuestions };
  };

  const getScorePercentage = () => {
    const { correct, total } = getScore();
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return userAnswers.size;
  };

  const retakeExam = () => {
    setUserAnswers(new Map());
    setCurrentQuestionIndex(0);
    setIsExamStarted(false);
    setIsExamCompleted(false);
    setShowResults(false);
    setTimeLeft((examData?.duration || 60) * 60);
  };

  if (!examData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading exam...</div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentQuestionIndex];
  const userAnswer = userAnswers.get(currentQuestion?.id || '');

  if (!isExamStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <FadeContent>
              <div className="flex items-center gap-4 mb-8">
                <Button
                  variant="outline"
                  onClick={() => router.push('/exam-prep/full-exam')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">Ready to Start?</h1>
              </div>
            </FadeContent>

            <AnimatedContent>
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">{examData.examTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Exam Instructions</h2>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-900">{examData.instructions}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{examData.questions.length}</div>
                      <div className="text-sm text-gray-600">Questions</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{examData.duration}</div>
                      <div className="text-sm text-gray-600">Minutes</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">MCQ</div>
                      <div className="text-sm text-gray-600">Format</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={startExam}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Clock className="w-5 h-5 mr-2" />
                      Start Exam
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AnimatedContent>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const { correct, total } = getScore();
    const percentage = getScorePercentage();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <FadeContent>
              <div className="text-center mb-8">
                <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Exam Complete!</h1>
                <p className="text-lg text-slate-600">Here are your results</p>
              </div>
            </FadeContent>

            <AnimatedContent>
              <Card className="mb-6">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
                    <div className="text-xl text-gray-600">
                      {correct} out of {total} questions correct
                    </div>
                  </div>

                  <Progress value={percentage} className="mb-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-700">{correct}</div>
                      <div className="text-sm text-green-600">Correct</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-700">{total - correct}</div>
                      <div className="text-sm text-red-600">Incorrect</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-700">
                        {formatTime((examData.duration * 60) - timeLeft)}
                      </div>
                      <div className="text-sm text-blue-600">Time Used</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={retakeExam} variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake Exam
                    </Button>
                    <Button onClick={() => router.push('/exam-prep')}>
                      Back to Exam Prep
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Question-by-Question Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {examData.questions.map((question, index) => {
                      const answer = userAnswers.get(question.id);
                      const isCorrect = answer?.isCorrect;
                      
                      return (
                        <div key={question.id} className="border rounded-lg p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0">
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">Question {index + 1}</span>
                                <Badge variant={question.difficulty === 'easy' ? 'secondary' : 
                                              question.difficulty === 'medium' ? 'default' : 'destructive'}>
                                  {question.difficulty}
                                </Badge>
                              </div>
                              <p className="text-gray-900 mb-3">{question.question}</p>
                              
                              <div className="space-y-2">
                                {question.options.map((option, optionIndex) => {
                                  const optionLetter = String.fromCharCode(65 + optionIndex);
                                  const isSelected = answer?.selectedAnswer === optionLetter;
                                  const isCorrectOption = question.correctAnswer === optionLetter;
                                  
                                  return (
                                    <div key={optionIndex} className={`
                                      p-2 rounded text-sm
                                      ${isCorrectOption ? 'bg-green-100 text-green-800' : ''}
                                      ${isSelected && !isCorrectOption ? 'bg-red-100 text-red-800' : ''}
                                      ${!isSelected && !isCorrectOption ? 'bg-gray-50' : ''}
                                    `}>
                                      <span className="font-medium">{optionLetter}.</span> {option}
                                      {isCorrectOption && <span className="ml-2 text-green-600">✓ Correct</span>}
                                      {isSelected && !isCorrectOption && <span className="ml-2 text-red-600">✗ Your answer</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {question.explanation && (
                                <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-900">
                                  <strong>Explanation:</strong> {question.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </AnimatedContent>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Header with Timer */}
          <FadeContent>
            <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-900">{examData.examTitle}</h1>
                <Badge variant="outline">
                  Question {currentQuestionIndex + 1} of {examData.questions.length}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className={`font-mono text-lg ${timeLeft < 300 ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <Button
                  onClick={handleSubmitExam}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Submit
                </Button>
              </div>
            </div>
          </FadeContent>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Panel */}
            <div className="lg:col-span-3">
              <AnimatedContent>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        Question {currentQuestionIndex + 1}
                        <Badge variant={currentQuestion?.difficulty === 'easy' ? 'secondary' : 
                                      currentQuestion?.difficulty === 'medium' ? 'default' : 'destructive'}>
                          {currentQuestion?.difficulty}
                        </Badge>
                      </CardTitle>
                      <div className="text-sm text-gray-500">
                        Topic: {currentQuestion?.topic}
                      </div>
                    </div>
                    <Progress 
                      value={((currentQuestionIndex + 1) / examData.questions.length) * 100} 
                      className="mt-2"
                    />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      {currentQuestion?.question}
                    </h3>
                    
                    <div className="space-y-3">
                      {currentQuestion?.options.map((option, index) => {
                        const optionLetter = String.fromCharCode(65 + index);
                        const isSelected = userAnswer?.selectedAnswer === optionLetter;
                        
                        return (
                          <Button
                            key={index}
                            variant={isSelected ? "default" : "outline"}
                            className={`w-full text-left justify-start p-4 h-auto ${
                              isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''
                            }`}
                            onClick={() => handleAnswerSelect(optionLetter)}
                          >
                            <span className="font-medium mr-3">{optionLetter}.</span>
                            <span>{option}</span>
                          </Button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={previousQuestion}
                        disabled={currentQuestionIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      
                      {currentQuestionIndex === examData.questions.length - 1 ? (
                        <Button
                          onClick={handleSubmitExam}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Submit Exam
                        </Button>
                      ) : (
                        <Button
                          onClick={nextQuestion}
                          disabled={currentQuestionIndex === examData.questions.length - 1}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedContent>
            </div>

            {/* Question Navigator */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Question Navigator</CardTitle>
                  <p className="text-xs text-gray-500">
                    {getAnsweredCount()} of {examData.questions.length} answered
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {examData.questions.map((_, index) => {
                      const isAnswered = userAnswers.has(examData.questions[index].id);
                      const isCurrent = index === currentQuestionIndex;
                      
                      return (
                        <Button
                          key={index}
                          variant={isCurrent ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToQuestion(index)}
                          className={`
                            relative
                            ${isCurrent ? 'bg-blue-600 hover:bg-blue-700' : ''}
                            ${isAnswered && !isCurrent ? 'bg-green-50 border-green-300 text-green-700' : ''}
                          `}
                        >
                          {index + 1}
                          {isAnswered && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded" />
                      <span>Current</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span>Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-gray-300 rounded" />
                      <span>Unanswered</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {timeLeft < 300 && (
                <Card className="mt-4 border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <div className="text-sm text-red-700 font-medium">
                      Less than 5 minutes left!
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
