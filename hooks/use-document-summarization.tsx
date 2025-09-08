"use client"

import { useState, useCallback } from 'react';

interface SummarizationOptions {
  summaryType?: 'brief' | 'detailed' | 'key-points' | 'academic' | 'study-guide' | 'comprehensive';
  maxTokens?: number;
  model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-5-thinking-pro';
}

interface SummarizationResult {
  summary: string;
  metadata: {
    documentId: string;
    title: string;
    summaryType: string;
    model: string;
    tokensUsed: number;
    contextChunks: number;
    originalTextLength: number;
  };
}

interface UseDocumentSummarizationReturn {
  summarizeDocument: (
    documentId: string, 
    options?: SummarizationOptions
  ) => Promise<SummarizationResult | null>;
  isLoading: boolean;
  error: string | null;
}

export function useDocumentSummarization(): UseDocumentSummarizationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarizeDocument = useCallback(async (
    documentId: string, 
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📄 Starting document summarization:', { documentId, options });

      const response = await fetch('/api/reading/summarize-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          summaryType: 'comprehensive',
          maxTokens: 2000,
          model: 'gpt-5',
          ...options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to summarize document');
      }

      const data = await response.json();
      console.log('✅ Document summarized successfully:', {
        summaryLength: data.summary.length,
        tokensUsed: data.metadata.tokensUsed,
        model: data.metadata.model
      });

      return data;
    } catch (err: any) {
      console.error('❌ Error summarizing document:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    summarizeDocument,
    isLoading,
    error
  };
}


