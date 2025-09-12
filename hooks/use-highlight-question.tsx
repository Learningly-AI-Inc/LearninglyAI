'use client';

import { useState, useCallback } from 'react';
import { useDocument } from '@/components/reading/document-context';
import { toast } from 'sonner';

interface Highlight {
  id: string;
  selectedText: string;
  pageNumber: number;
  color: string;
  rects: any[];
  question?: string;
  questionId?: string;
}

interface UseHighlightQuestionReturn {
  isModalOpen: boolean;
  selectedHighlight: Highlight | null;
  openQuestionModal: (highlight: Highlight) => void;
  closeQuestionModal: () => void;
  submitQuestion: (question: string, highlightId: string) => Promise<void>;
}

export function useHighlightQuestion(): UseHighlightQuestionReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { document } = useDocument();
  // Using Sonner toast directly

  const openQuestionModal = useCallback((highlight: Highlight) => {
    setSelectedHighlight(highlight);
    setIsModalOpen(true);
  }, []);

  const closeQuestionModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedHighlight(null);
  }, []);

  const submitQuestion = useCallback(async (question: string, highlightId: string) => {
    if (!document || !selectedHighlight) {
      throw new Error('No document or highlight selected');
    }

    setIsSubmitting(true);

    try {
      // Create a question object with context
      const questionData = {
        question,
        highlightId,
        highlightedText: selectedHighlight.selectedText,
        documentId: document.id,
        documentTitle: document.title,
        pageNumber: selectedHighlight.pageNumber,
        timestamp: new Date().toISOString(),
      };

      // Send question to chat system via document context
      // This would typically integrate with your chat API
      console.log('Submitting question:', questionData);

      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add question to highlight in context (this would be handled by highlight context)
      // For now, we'll just log it
      console.log('Question added to highlight:', {
        highlightId,
        question,
        questionId: `q-${Date.now()}`
      });

      toast.success("Your question has been added to the chat.");

    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error("Failed to submit question. Please try again.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [document, selectedHighlight]);

  return {
    isModalOpen,
    selectedHighlight,
    openQuestionModal,
    closeQuestionModal,
    submitQuestion,
  };
}
