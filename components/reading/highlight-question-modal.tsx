'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SlideIn } from '@/components/react-bits/slide-in';
import { toast } from 'sonner';

interface HighlightQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedText: string;
  onSubmitQuestion: (question: string, highlightId: string) => Promise<void>;
  highlightId: string;
}

export function HighlightQuestionModal({
  isOpen,
  onClose,
  highlightedText,
  onSubmitQuestion,
  highlightId
}: HighlightQuestionModalProps) {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Using Sonner toast directly

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestion('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error("Please enter a question about the highlighted text.");
      return;
    }

    if (question.trim().length < 10) {
      toast.error("Please enter a more detailed question (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmitQuestion(question.trim(), highlightId);
      toast.success("Your question has been added to the chat.");
      onClose();
    } catch {
      toast.error("Failed to submit question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[80vh] overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <SlideIn direction="up" duration={0.3}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold">
              Ask about highlighted text
            </DialogTitle>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Selected text:</p>
                             <p className="text-sm font-medium leading-relaxed">
                 &ldquo;{highlightedText.length > 200 
                   ? `${highlightedText.substring(0, 200)}...` 
                   : highlightedText}&rdquo;
               </p>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="question" className="text-sm font-medium">
                Your question
              </label>
              <Textarea
                ref={textareaRef}
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about this text?"
                className="min-h-[120px] resize-none"
                disabled={isSubmitting}
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum 10 characters</span>
                <span>{question.length}/500</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-[44px] px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || question.trim().length < 10}
                className="min-h-[44px] px-4"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Question'}
              </Button>
            </DialogFooter>
          </form>
        </SlideIn>
      </DialogContent>
    </Dialog>
  );
}
