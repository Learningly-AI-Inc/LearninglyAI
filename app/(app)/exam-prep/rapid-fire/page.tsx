"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedContent, FadeContent, ClickSpark } from "@/components/react-bits";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Zap,
  Trophy,
  RotateCcw,
  Play,
  Pause,
  SkipForward
} from "lucide-react";

interface RapidFireQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface RapidFireSession {
  questions: RapidFireQuestion[];
  currentIndex: number;
  score: number;
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  endTime?: number;
  userAnswers: { [questionId: string]: { answer: string; timeSpent: number; isCorrect: boolean } };
}

export default function RapidFireQuizPage() {
  const router = useRouter();
  const [session, setSession] = useState<RapidFireSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load exam data from localStorage or generate new questions
  useEffect(() => {
    loadExamData();
  }, []);

  // Timer effect
  useEffect(() => {
    if (session?.isActive && !session.isPaused && session.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSession(prev => {
          if (!prev) return null;
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            // Time's up - auto-submit current question
            handleTimeUp();
            return { ...prev, timeRemaining: 0, isActive: false };
          }
          
          return { ...prev, timeRemaining: newTimeRemaining };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [session?.isActive, session?.isPaused, session?.timeRemaining]);

  const loadExamData = async () => {
    try {
      // Try to load from localStorage first
      const storedExam = localStorage.getItem('generatedExam');
      if (storedExam) {
        const examData = JSON.parse(storedExam);
        const rapidFireQuestions = examData.exams?.filter((exam: any) => exam.examType === 'rapid-fire') || [];
        
        if (rapidFireQuestions.length > 0) {
          const questions = rapidFireQuestions[0].questions || [];
          initializeSession(questions);
          return;
        }
      }

      // If no stored exam, generate sample questions
      const sampleQuestions: RapidFireQuestion[] = [
        {
          id: '1',
          question: 'What is the primary purpose of a constructor in object-oriented programming?',
          options: ['To destroy objects', 'To initialize objects', 'To hide data', 'To inherit properties'],
          correctAnswer: 'To initialize objects',
          explanation: 'Constructors are special methods used to initialize objects when they are created.',
          difficulty: 'easy',
          topic: 'Object-Oriented Programming'
        },
        {
          id: '2',
          question: 'Which data structure follows LIFO (Last In, First Out) principle?',
          options: ['Queue', 'Stack', 'Array', 'Linked List'],
          correctAnswer: 'Stack',
          explanation: 'Stack follows LIFO principle where the last element added is the first one to be removed.',
          difficulty: 'medium',
          topic: 'Data Structures'
        },
        {
          id: '3',
          question: 'What is the time complexity of binary search?',
          options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
          correctAnswer: 'O(log n)',
          explanation: 'Binary search has O(log n) time complexity as it eliminates half of the search space in each iteration.',
          difficulty: 'medium',
          topic: 'Algorithms'
        }
      ];

      initializeSession(sampleQuestions);
    } catch (error) {
      console.error('Error loading exam data:', error);
      setIsLoading(false);
    }
  };

  const initializeSession = (questions: RapidFireQuestion[]) => {
    const newSession: RapidFireSession = {
      questions,
      currentIndex: 0,
      score: 0,
      timeRemaining: 30, // 30 seconds per question
      isActive: false,
      isPaused: false,
      startTime: Date.now(),
      userAnswers: {}
    };
    
    setSession(newSession);
    setIsLoading(false);
  };

  const startQuiz = () => {
    if (!session) return;
    
    setSession(prev => prev ? { ...prev, isActive: true, startTime: Date.now() } : null);
    setQuestionStartTime(Date.now());
  };

  const pauseQuiz = () => {
    if (!session) return;
    
    setSession(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
  };

  const handleAnswerSelect = (answer: string) => {
    if (!session || showResult) return;
    setSelectedAnswer(answer);
  };

  const submitAnswer = () => {
    if (!session || !selectedAnswer) return;

    const currentQuestion = session.questions[session.currentIndex];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    const newUserAnswers = {
      ...session.userAnswers,
      [currentQuestion.id]: {
        answer: selectedAnswer,
        timeSpent,
        isCorrect
      }
    };

    setSession(prev => prev ? {
      ...prev,
      score: prev.score + (isCorrect ? 1 : 0),
      userAnswers: newUserAnswers
    } : null);

    setShowResult(true);

    // Auto-advance after 2 seconds
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    if (!session) return;

    if (session.currentIndex + 1 >= session.questions.length) {
      // Quiz completed
      setSession(prev => prev ? {
        ...prev,
        isActive: false,
        endTime: Date.now()
      } : null);
    } else {
      // Move to next question
      setSession(prev => prev ? {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        timeRemaining: 30
      } : null);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
    }
  };

  const handleTimeUp = () => {
    if (!session || !selectedAnswer) {
      // Auto-select first option if no answer selected
      const currentQuestion = session?.questions[session.currentIndex];
      if (currentQuestion) {
        setSelectedAnswer(currentQuestion.options[0]);
        setTimeout(() => {
          submitAnswer();
        }, 100);
      }
    } else {
      submitAnswer();
    }
  };

  const resetQuiz = () => {
    if (!session) return;
    
    setSession(prev => prev ? {
      ...prev,
      currentIndex: 0,
      score: 0,
      timeRemaining: 30,
      isActive: false,
      isPaused: false,
      startTime: Date.now(),
      endTime: undefined,
      userAnswers: {}
    } : null);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading rapid-fire quiz...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">Failed to load quiz data</p>
          <Button onClick={() => router.push('/exam-prep')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exam Prep
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[session.currentIndex];
  const isQuizComplete = session.currentIndex >= session.questions.length;
  const progress = (session.currentIndex / session.questions.length) * 100;

  if (isQuizComplete) {
    const totalTime = session.endTime ? Math.floor((session.endTime - session.startTime) / 1000) : 0;
    const accuracy = (session.score / session.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <FadeContent>
              <div className="flex items-center gap-4 mb-8">
                <Button
                  variant="outline"
                  onClick={() => router.push('/exam-prep')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quiz Complete!</h1>
                    <p className="text-slate-600">Rapid-Fire Challenge Results</p>
                  </div>
                </div>
              </div>
            </FadeContent>

            <AnimatedContent>
              <Card className="text-center">
                <CardContent className="p-8">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Congratulations!</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{session.score}</div>
                      <div className="text-sm text-green-800">Correct Answers</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{accuracy.toFixed(1)}%</div>
                      <div className="text-sm text-blue-800">Accuracy</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{formatTime(totalTime)}</div>
                      <div className="text-sm text-purple-800">Total Time</div>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <ClickSpark>
                      <Button onClick={resetQuiz} className="bg-purple-600 hover:bg-purple-700">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </ClickSpark>
                    <Button variant="outline" onClick={() => router.push('/exam-prep')}>
                      Back to Exam Prep
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <FadeContent>
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => router.push('/exam-prep')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-purple-500" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Rapid-Fire Quiz</h1>
                  <p className="text-slate-600">Question {session.currentIndex + 1} of {session.questions.length}</p>
                </div>
              </div>
            </div>
          </FadeContent>

          {/* Progress and Timer */}
          <FadeContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{session.score}</div>
                  <div className="text-sm text-slate-600">Score</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{formatTime(session.timeRemaining)}</div>
                  <div className="text-sm text-slate-600">Time Remaining</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
                  <div className="text-sm text-slate-600">Progress</div>
                </CardContent>
              </Card>
            </div>
          </FadeContent>

          {/* Progress Bar */}
          <FadeContent>
            <Progress value={progress} className="mb-6" />
          </FadeContent>

          {/* Quiz Controls */}
          {!session.isActive && (
            <FadeContent>
              <div className="text-center mb-6">
                <ClickSpark>
                  <Button onClick={startQuiz} size="lg" className="bg-purple-600 hover:bg-purple-700">
                    <Play className="w-5 h-5 mr-2" />
                    Start Rapid-Fire Quiz
                  </Button>
                </ClickSpark>
              </div>
            </FadeContent>
          )}

          {/* Question Card */}
          {session.isActive && currentQuestion && (
            <AnimatedContent>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-500" />
                      {currentQuestion.topic}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pauseQuiz}
                      >
                        {session.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextQuestion}
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <h3 className="text-xl font-medium">{currentQuestion.question}</h3>
                    
                    {showResult ? (
                      <div className="text-center">
                        {selectedAnswer === currentQuestion.correctAnswer ? (
                          <div className="text-green-600 flex items-center justify-center gap-2 mb-4">
                            <CheckCircle className="w-6 h-6" />
                            <span className="text-lg font-medium">Correct!</span>
                          </div>
                        ) : (
                          <div className="text-red-600 flex items-center justify-center gap-2 mb-4">
                            <XCircle className="w-6 h-6" />
                            <span className="text-lg font-medium">Incorrect</span>
                          </div>
                        )}
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-sm text-slate-600 mb-2">Correct Answer: {currentQuestion.correctAnswer}</p>
                          <p className="text-sm">{currentQuestion.explanation}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <ClickSpark key={index}>
                            <Button
                              variant={selectedAnswer === option ? "default" : "outline"}
                              onClick={() => handleAnswerSelect(option)}
                              className={`text-left justify-start p-4 h-auto ${
                                selectedAnswer === option 
                                  ? 'bg-purple-600 hover:bg-purple-700' 
                                  : 'hover:bg-purple-50'
                              }`}
                            >
                              {option}
                            </Button>
                          </ClickSpark>
                        ))}
                      </div>
                    )}
                    
                    {selectedAnswer && !showResult && (
                      <div className="text-center">
                        <Button 
                          onClick={submitAnswer}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Submit Answer
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedContent>
          )}
        </div>
      </div>
    </div>
  );
}


