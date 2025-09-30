"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FlipCard, AnimatedContent, ClickSpark, FadeContent } from "@/components/react-bits";
import { 
  Brain, 
  FileText, 
  Smile, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Shuffle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Types
interface QuizQuestion {
  id: string;
  type: "single" | "fill";
  prompt: string;
  answer: string;
  choices?: string[];
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface MemeContent {
  topText: string;
  bottomText: string;
}

// API functions
async function postJSON(path: string, payload?: Record<string, unknown>) {
  const res = await fetch(path, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(payload || {}) 
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// Quiz Component
async function fetchUserExamText(): Promise<string> {
  try {
    const res = await fetch('/api/exam-prep/files')
    if (!res.ok) return ''
    const data = await res.json()
    const files = (data?.files || []).slice(0, 3)
    let combined = ''
    for (const f of files) {
      const r = await fetch(`/api/exam-prep/files/${encodeURIComponent(f.id)}/content`)
      if (!r.ok) continue
      const c = await r.json()
      if (c?.extracted_content) {
        combined += '\n\n' + c.extracted_content
      }
    }
    return combined
  } catch {
    return ''
  }
}

function QuizSession({ topic }: { topic: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(30);

  const currentQuestion = questions[currentIndex];

  async function generateQuiz() {
    try {
      setIsLoading(true);
      // Pull extracted text from recent uploads (best-effort)
      const contextText = await fetchUserExamText();
      const payload: any = { topic, count, difficulty: 'medium', durationMinutes: duration };
      if (contextText) payload.context = contextText.slice(0, 8000);
      const data = await postJSON('/api/quiz', payload);
      if (data?.questions?.length) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setScore(0);
        setIsCompleted(false);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  function submitAnswer() {
    if (!currentQuestion || !userAnswer.trim()) return;

    const isCorrect = currentQuestion.type === 'fill' 
      ? userAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim()
      : userAnswer === currentQuestion.answer;

    if (isCorrect) setScore(score + 1);
    
    setShowResult(true);
    
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setIsCompleted(true);
      } else {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer("");
        setShowResult(false);
      }
    }, 1500);
  }

  function resetQuiz() {
    setCurrentIndex(0);
    setUserAnswer("");
    setScore(0);
    setIsCompleted(false);
    setShowResult(false);
    generateQuiz();
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Generating your quiz...</p>
        </CardContent>
      </Card>
    );
  }

  if (isCompleted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
          <p className="text-xl mb-6">Score: {score} / {questions.length}</p>
          <Button onClick={resetQuiz} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pre-quiz configuration
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Configure your quiz</h3>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-xs text-slate-500">Questions</label>
              <Input type="number" min={3} max={50} value={count} onChange={e => setCount(parseInt(e.target.value || '0'))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Duration (minutes)</label>
              <Input type="number" min={5} max={180} value={duration} onChange={e => setDuration(parseInt(e.target.value || '0'))} />
            </div>
          </div>
          <Button onClick={generateQuiz} disabled={isLoading} className="w-full sm:w-auto">Generate</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Question {currentIndex + 1} of {questions.length}</CardTitle>
          <div className="flex gap-2 items-center text-sm text-slate-600">
            <div>Score: {score}</div>
            <div className="hidden sm:block">•</div>
            <div>Duration: {duration} min</div>
          </div>
        </div>
        <Progress value={(currentIndex / questions.length) * 100} className="w-full" />
      </CardHeader>
      <CardContent className="p-6">
        {currentQuestion && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{currentQuestion.prompt}</h3>
            
            {showResult ? (
              <div className="text-center">
                {userAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim() ? (
                  <div className="text-green-600 flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    <span>Correct!</span>
                  </div>
                ) : (
                  <div className="text-red-600 flex items-center justify-center gap-2">
                    <XCircle className="w-6 h-6" />
                    <span>Incorrect. Answer: {currentQuestion.answer}</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {currentQuestion.type === 'single' && currentQuestion.choices ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentQuestion.choices.map((choice) => (
                      <Button
                        key={choice}
                        variant={userAnswer === choice ? "default" : "outline"}
                        onClick={() => setUserAnswer(choice)}
                        className="text-left justify-start text-sm sm:text-base p-3 sm:p-4"
                      >
                        {choice}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
                  />
                )}
                
                <Button 
                  onClick={submitAnswer} 
                  disabled={!userAnswer.trim()}
                  className="w-full"
                >
                  Submit Answer
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Flashcards Component
function FlashcardsSession({ topic }: { topic: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [knownCount, setKnownCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    generateFlashcards();
  }, [topic]);

  async function generateFlashcards() {
    try {
      setIsLoading(true);
      console.log('Generating flashcards for topic:', topic);
      
      // Try test API first for debugging
      const data = await postJSON('/api/test-exam', { 
        mode: 'flashcards',
        topic, 
        count: 8, 
        difficulty: 'medium' 
      });
      
      if (data?.cards?.length) {
        setCards(data.cards);
      } else {
        console.log('No cards in response:', data);
        // Set fallback cards
        setCards([
          {
            id: '1',
            front: `${topic} - Concept 1`,
            back: 'This is a key concept explanation'
          },
          {
            id: '2',
            front: `${topic} - Concept 2`,
            back: 'This is another important concept'
          },
          {
            id: '3',
            front: `${topic} - Concept 3`,
            back: 'This is a third concept to learn'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      // Fallback cards
      setCards([
        {
          id: '1',
          front: `${topic} - Concept 1`,
          back: 'This is a key concept explanation'
        },
        {
          id: '2',
          front: `${topic} - Concept 2`,
          back: 'This is another important concept'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function nextCard(known: boolean = false) {
    if (known) setKnownCount(knownCount + 1);
    
    setIsFlipped(false);
    setCurrentIndex((currentIndex + 1) % cards.length);
  }

  function previousCard() {
    setIsFlipped(false);
    setCurrentIndex((currentIndex - 1 + cards.length) % cards.length);
  }

  function shuffleCards() {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Generating your flashcards...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Card {currentIndex + 1} of {cards.length}</CardTitle>
          <div className="text-sm text-slate-500">Known: {knownCount}</div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {currentCard && (
          <div className="space-y-6">
            <FlipCard
              front={
                <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center p-4 sm:p-6">
                  <p className="text-center text-base sm:text-lg font-medium">{currentCard.front}</p>
                </div>
              }
              back={
                <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center p-4 sm:p-6">
                  <p className="text-center text-base sm:text-lg">{currentCard.back}</p>
                </div>
              }
              className="h-40 sm:h-48"
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button variant="outline" onClick={previousCard} className="w-full sm:w-auto">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <Button variant="outline" onClick={shuffleCards} className="w-full sm:w-auto">
                <Shuffle className="w-4 h-4 mr-1 sm:mr-0" />
                <span className="sm:hidden ml-2">Shuffle</span>
              </Button>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => nextCard(false)} className="flex-1 sm:flex-none">
                  Skip
                </Button>
                <Button onClick={() => nextCard(true)} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Meme Component
function MemeSession({ topic }: { topic: string }) {
  const [meme, setMeme] = useState<MemeContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateMeme() {
    try {
      setIsLoading(true);
      console.log('Generating meme for topic:', topic);
      
      // Try test API first for debugging
      const data = await postJSON('/api/test-exam', { 
        mode: 'meme',
        topic 
      });
      
      if (data?.topText && data?.bottomText) {
        setMeme({
          topText: data.topText,
          bottomText: data.bottomText
        });
      }
    } catch (error) {
      console.error('Failed to generate meme:', error);
      // Fallback meme
      setMeme({
        topText: `When you're studying ${topic}`,
        bottomText: "And it finally clicks!"
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    generateMeme();
  }, [topic]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Meme</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Creating your meme...</p>
          </div>
        ) : meme ? (
          <div className="space-y-6">
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
              <div className="h-full grid grid-rows-2">
                <div className="bg-gradient-to-br from-purple-100 to-purple-300 flex items-center justify-center p-4">
                  <p className="text-center text-lg font-bold text-purple-900 drop-shadow">
                    {meme.topText}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-pink-100 to-pink-300 flex items-center justify-center p-4">
                  <p className="text-center text-lg font-bold text-pink-900 drop-shadow">
                    {meme.bottomText}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={generateMeme} disabled={isLoading} className="w-full sm:w-auto">
                <RotateCcw className="w-4 h-4 mr-2" />
                Generate New Meme
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Failed to generate meme. Please try again.</p>
            <Button onClick={generateMeme} className="mt-4">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Session Page Component
function ExamPrepSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode') as 'quiz' | 'flashcards' | 'meme' | null;
  const topic = searchParams.get('topic') || 'Uploaded materials';

  // Avoid router.push during render; guard with effect
  useEffect(() => {
    if (!mode) {
      router.replace('/exam-prep');
    }
  }, [mode, router]);
  if (!mode) return null;

  const getIcon = () => {
    switch (mode) {
      case 'quiz': return <Brain className="w-6 h-6" />;
      case 'flashcards': return <FileText className="w-6 h-6" />;
      case 'meme': return <Smile className="w-6 h-6" />;
      default: return null;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'quiz': return 'Interactive Quiz';
      case 'flashcards': return 'Smart Flashcards';
      case 'meme': return 'Memory Memes';
      default: return 'Study Session';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <FadeContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 sm:mb-8">
              <Button
                variant="outline"
                onClick={() => router.push('/exam-prep')}
                className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <div className="flex items-center gap-3 w-full">
                {getIcon()}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">{getTitle()}</h1>
                  <p className="text-slate-600 text-sm sm:text-base truncate">Topic: {topic}</p>
                </div>
              </div>
            </div>
          </FadeContent>

          {/* Study Session Content */}
          <AnimatedContent>
            {mode === 'quiz' && <QuizSession topic={topic} />}
            {mode === 'flashcards' && <FlashcardsSession topic={topic} />}
            {mode === 'meme' && <MemeSession topic={topic} />}
          </AnimatedContent>
        </div>
      </div>
    </div>
  );
}

export default function ExamPrepSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading study session...</div>
      </div>
    }>
      <ExamPrepSessionContent />
    </Suspense>
  );
}
