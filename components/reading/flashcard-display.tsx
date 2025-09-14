"use client"

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';

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

  const currentCard = flashcards[currentIndex];

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
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Flashcards
          </h3>
          <p className="text-xs text-gray-500">
            {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              disabled={isRegenerating}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              {isRegenerating ? (
                <Sparkles className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RotateCcw className="h-3 w-3 mr-1" />
              )}
              {isRegenerating ? 'Generating...' : 'Regenerate'}
            </Button>
          )}
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div 
            className="relative w-full h-64 cursor-pointer perspective-1000"
            onClick={handleFlip}
          >
            <div 
              className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front of card */}
              <div className="absolute inset-0 w-full h-full backface-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-lg flex flex-col justify-center">
                  <div className="text-center">
                    <div className="text-xs text-blue-600 font-medium mb-2">
                      {currentCard.category && `${currentCard.category} • `}
                      {currentCard.difficulty && currentCard.difficulty.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <Markdown>{currentCard.front}</Markdown>
                    </div>
                    <div className="text-xs text-blue-500 mt-4 font-medium">
                      Click to reveal answer
                    </div>
                  </div>
                </div>
              </div>

              {/* Back of card */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 shadow-lg flex flex-col justify-center">
                  <div className="text-center">
                    <div className="text-xs text-green-600 font-medium mb-2">
                      ANSWER
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <Markdown>{currentCard.back}</Markdown>
                    </div>
                    <div className="text-xs text-green-500 mt-4 font-medium">
                      Click to see question
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-t border-gray-200">
        <Button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleFlip}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </Button>
          <Button
            onClick={handleReset}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Reset
          </Button>
        </div>

        <Button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Next
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="px-3 pb-3">
          <div className="text-xs text-gray-500 text-center">
            Generated from "{metadata.title}" • {metadata.count} cards • {metadata.difficulty} difficulty
            {metadata.tokensUsed && ` • ${metadata.tokensUsed} tokens used`}
          </div>
        </div>
      )}
    </div>
  );
}
