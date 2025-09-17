"use client"

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedContent, Bounce, ClickSpark, FadeContent } from "@/components/react-bits";
import { Brain, FileText, Smile, Send, ArrowRight, Upload } from "lucide-react";

// Types
interface StudyMode {
  id: 'quiz' | 'flashcards' | 'meme';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

// Study modes configuration
const studyModes: StudyMode[] = [
  {
    id: 'quiz',
    title: 'Interactive Quiz',
    description: 'Test your knowledge with AI-generated questions',
    icon: Brain,
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    id: 'flashcards',
    title: 'Smart Flashcards',
    description: 'Master concepts with spaced repetition',
    icon: FileText,
    gradient: 'from-green-400 to-green-600'
  },
  {
    id: 'meme',
    title: 'Memory Memes',
    description: 'Learn through humor and visual memory',
    icon: Smile,
    gradient: 'from-purple-400 to-purple-600'
  }
];

// Main selection screen component
function ExamPrepSelection() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<StudyMode['id'] | null>(null);
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleModeSelect = (mode: StudyMode['id']) => {
    setSelectedMode(mode);
  };

  const handleStartStudy = async () => {
    if (!selectedMode || !context.trim()) return;
    
    setIsLoading(true);
    
    // Navigate to the specific mode with context
    const params = new URLSearchParams({
      mode: selectedMode,
      topic: context.trim()
    });
    
    // Navigate to the study session
    router.push(`/exam-prep/session?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <FadeContent>
            <div className="text-center mb-8 sm:mb-12">
              <Bounce>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                  Choose Your Study Method
                </h1>
              </Bounce>
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto px-4">
                Select how you'd like to study and provide context about your topic
              </p>
            </div>
          </FadeContent>

          {/* Exam Prep Options */}
          <FadeContent>
            <div className="flex justify-center mb-8">
              {/* AI-Powered Full-Length Exam Prep */}
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">AI-Powered Full-Length Exam Prep</h2>
                    <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                      Advanced AI system with pattern analysis, content optimization, and intelligent question generation. Upload sample questions + learning materials for smart exam creation.
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      <Button 
                        onClick={() => router.push('/exam-prep/full-length')}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white w-full"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Start AI Exam Prep
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </FadeContent>

          {/* Study Mode Cards */}
          <AnimatedContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {studyModes.map((mode, index) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              
              return (
                <ClickSpark key={mode.id}>
                  <Card 
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                      isSelected 
                        ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleModeSelect(mode.id)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${mode.gradient} mb-3 sm:mb-4 flex items-center justify-center`}>
                        <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                        {mode.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {mode.description}
                      </p>
                      {isSelected && (
                        <div className="mt-3 sm:mt-4 flex items-center text-blue-600 text-sm font-medium">
                          <span>Selected</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ClickSpark>
              );
            })}
          </AnimatedContent>

          {/* Context Input */}
          <FadeContent>
            <Card className="mb-6 sm:mb-8">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Provide Context
                </h3>
                <Textarea
                  placeholder="Enter your study topic, specific concepts, or any context that will help generate better content. For example: 'JavaScript promises and async/await', 'Calculus derivatives', or 'World War II causes'..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  className="resize-none text-sm sm:text-base"
                />
                <p className="text-xs sm:text-sm text-slate-500 mt-2">
                  The more specific you are, the better your study materials will be!
                </p>
              </CardContent>
            </Card>
          </FadeContent>

          {/* Start Button */}
          <FadeContent>
            <div className="text-center">
              <ClickSpark>
                <Button
                  onClick={handleStartStudy}
                  disabled={!selectedMode || !context.trim() || isLoading}
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Start Studying
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                  )}
                </Button>
              </ClickSpark>
            </div>
          </FadeContent>
        </div>
      </div>
    </div>
  );
}

// URL parameters based component  
function ExamPrepPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const topic = searchParams.get('topic');

  // If we have URL params, this means we're coming from the old system
  // For now, redirect to selection screen to maintain clean UX
  if (mode || topic) {
    return <ExamPrepSelection />;
  }

  // Default: show the new selection interface
  return <ExamPrepSelection />;
}

// Main page component
export default function ExamPrepPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-lg text-slate-600">Loading...</div>
    </div>}>
      <ExamPrepPageContent />
    </Suspense>
  );
}


