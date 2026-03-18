"use client"

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Sparkles, 
  BookOpen,
  Eye,
  EyeOff,
  Target,
  Brain,
  Shuffle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Markdown } from '@/components/ui/markdown';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { FadeContent } from '@/components/react-bits/fade-content';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
}

interface FlashcardDisplayProps {
  flashcards: Flashcard[];
  metadata?: {
    documentId: string;
    title: string;
    count: number;
    difficulty: string;
    focus: string;
    model: string;
    tokensUsed: number;
  };
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function FlashcardDisplay({ 
  flashcards, 
  metadata, 
  onRegenerate, 
  isRegenerating = false 
}: FlashcardDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewedCards, setViewedCards] = useState<Set<number>>(new Set());

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setViewedCards(prev => new Set([...prev, currentIndex]));
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setViewedCards(new Set());
  };

  const shuffleCards = () => {
    // For demonstration - in a real app you'd shuffle the array
    setCurrentIndex(Math.floor(Math.random() * flashcards.length));
    setIsFlipped(false);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  if (!currentCard) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            No flashcards available
          </h3>
          <p className="text-xs text-gray-600">
            Generate flashcards to start studying
          </p>
        </div>
      </div>
    );
  }

  return (
    <FadeContent className="h-full flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Study Flashcards</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Card {currentIndex + 1} of {flashcards.length}
                </Badge>
                {currentCard.difficulty && (
                  <Badge className={`text-xs ${getDifficultyColor(currentCard.difficulty)}`}>
                    {currentCard.difficulty}
                  </Badge>
                )}
                {viewedCards.has(currentIndex) && (
                  <Badge className="text-xs bg-blue-100 text-blue-700">
                    Viewed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ClickSpark>
              <Button
                onClick={shuffleCards}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Shuffle className="h-3 w-3" />
              </Button>
            </ClickSpark>
            {onRegenerate && (
              <ClickSpark>
                <Button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {isRegenerating ? (
                    <Sparkles className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                </Button>
              </ClickSpark>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{viewedCards.size} viewed</span>
            <span>{flashcards.length - viewedCards.size} remaining</span>
          </div>
        </div>
      </div>

      {/* Enhanced Flashcard */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-muted/20 to-muted/40 overflow-auto">
        <div className="w-full max-w-lg">
          <ClickSpark>
            <Card 
              className="relative w-full h-80 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              onClick={handleFlip}
            >
                <CardContent className="p-0 h-full">
                  <div className="relative w-full h-full overflow-hidden rounded-lg">
                    {/* Front Side */}
                    <div className={`absolute inset-0 w-full h-full transition-all duration-700 ${
                      isFlipped ? 'opacity-0 rotate-y-180' : 'opacity-100 rotate-y-0'
                    }`}>
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 flex flex-col">
                        <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-white" />
                          </div>
                          <Badge className="bg-white/20 text-white border-white/30">
                            Question
                          </Badge>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50">
                          <div className="text-base md:text-lg leading-relaxed text-center px-2">
                            <div className="text-white font-medium [&>*]:text-white [&>strong]:text-white/90">
                              <Markdown>
                                {currentCard.front}
                              </Markdown>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-100 mt-4 flex-shrink-0">
                          <Eye className="h-4 w-4" />
                          <span>Click to reveal answer</span>
                        </div>
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className={`absolute inset-0 w-full h-full transition-all duration-700 ${
                      isFlipped ? 'opacity-100 rotate-y-0' : 'opacity-0 rotate-y-180'
                    }`}>
                      <div className="w-full h-full bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 p-6 flex flex-col text-white">
                        <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <Badge className="bg-white/20 text-white border-white/30">
                            Answer
                          </Badge>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50">
                          <div className="text-base md:text-lg leading-relaxed text-center px-2">
                            <div className="text-white font-medium [&>*]:text-white [&>strong]:text-green-100">
                              <Markdown>
                                {currentCard.back}
                              </Markdown>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-green-100 mt-4 flex-shrink-0">
                          <EyeOff className="h-4 w-4" />
                          <span>Click to see question</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ClickSpark>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="p-4 border-t border-border bg-background flex-shrink-0">
        <div className="flex items-center justify-between mb-4 gap-2">
          <ClickSpark>
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
          </ClickSpark>

          <div className="flex items-center gap-2 flex-1 justify-center">
            <ClickSpark>
              <Button
                onClick={handleFlip}
                variant={isFlipped ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-1"
              >
                {isFlipped ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isFlipped ? 'Hide' : 'Show'}
              </Button>
            </ClickSpark>
            
            <ClickSpark>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </ClickSpark>
          </div>

          <ClickSpark>
            <Button
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              variant="default"
              size="sm"
              className="flex items-center gap-1 bg-primary hover:bg-primary/90"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </ClickSpark>
        </div>

        <Separator className="mb-4" />

        {/* Enhanced Metadata */}
        {metadata && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {metadata.focus}
              </span>
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {metadata.difficulty}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {metadata.tokensUsed} tokens
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Generated from "{metadata.title}"
            </p>
          </div>
        )}
      </div>
    </FadeContent>
  );
}
