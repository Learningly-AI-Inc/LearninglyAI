"use client"

import { useState, useCallback } from 'react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
}

interface FlashcardGenerationOptions {
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  focus?: 'comprehensive' | 'key-concepts' | 'definitions' | 'facts' | 'examples';
}

interface FlashcardGenerationResult {
  flashcards: Flashcard[];
  metadata: {
    documentId: string;
    title: string;
    count: number;
    difficulty: string;
    focus: string;
    model: string;
    tokensUsed: number;
    contextChunks: number;
    originalTextLength: number;
  };
}

interface UseFlashcardsReturn {
  generateFlashcards: (
    documentId: string, 
    options?: FlashcardGenerationOptions
  ) => Promise<FlashcardGenerationResult | null>;
  isLoading: boolean;
  error: string | null;
}

export function useFlashcards(): UseFlashcardsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateFlashcards = useCallback(async (
    documentId: string, 
    options: FlashcardGenerationOptions = {}
  ): Promise<FlashcardGenerationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🃏 Starting flashcard generation:', { documentId, options });

      const response = await fetch('/api/reading/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          count: options.count || 8,
          difficulty: options.difficulty || 'medium',
          focus: options.focus || 'comprehensive',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }

      const data = await response.json();
      console.log('✅ Flashcards generated successfully:', {
        cardCount: data.flashcards.length,
        tokensUsed: data.metadata.tokensUsed,
        model: data.metadata.model
      });

      return data;
    } catch (err: any) {
      console.error('❌ Error generating flashcards:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateFlashcards,
    isLoading,
    error
  };
}
