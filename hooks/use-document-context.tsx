"use client"

import { useState, useCallback } from 'react';

interface ContextChunk {
  content: string;
  startIndex: number;
  endIndex: number;
  tokens: number;
  metadata?: {
    type?: string;
    paragraphCount?: number;
    isFallback?: boolean;
    note?: string;
  };
}

interface DocumentContext {
  chunks: ContextChunk[];
  totalTokens: number;
  metadata: {
    strategy: string;
    originalLength: number;
    chunkCount: number;
    averageChunkSize?: number;
  };
}

interface ContextOptions {
  maxTokens?: number;
  includeMetadata?: boolean;
  chunkSize?: number;
  overlap?: number;
  strategy?: 'smart' | 'sequential' | 'semantic';
}

interface UseDocumentContextReturn {
  getContext: (documentId: string, options?: ContextOptions) => Promise<DocumentContext | null>;
  chatWithContext: (
    message: string, 
    documentId: string, 
    conversationHistory?: any[]
  ) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useDocumentContext(): UseDocumentContextReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const getContext = useCallback(async (
    documentId: string, 
    options: ContextOptions = {}
  ): Promise<DocumentContext | null> => {
    // Check if documentId is a valid UUID before making API calls
    if (!isValidUUID(documentId)) {
      console.log('❌ Invalid UUID provided to getContext:', documentId);
      setError('Invalid document ID - cannot fetch document context');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📚 Fetching document context:', { documentId, options });

      const response = await fetch('/api/reading/get-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          options: {
            maxTokens: 8000,
            includeMetadata: true,
            chunkSize: 1000,
            overlap: 200,
            strategy: 'smart',
            ...options
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get document context');
      }

      const data = await response.json();
      console.log('✅ Context retrieved:', {
        chunks: data.context.chunks.length,
        totalTokens: data.context.totalTokens,
        strategy: data.context.metadata.strategy
      });

      return data.context;
    } catch (err: any) {
      console.error('❌ Error getting document context:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const chatWithContext = useCallback(async (
    message: string,
    documentId: string,
    conversationHistory: any[] = []
  ): Promise<string | null> => {
    // Check if documentId is a valid UUID before making API calls
    if (!isValidUUID(documentId)) {
      console.log('❌ Invalid UUID provided to chatWithContext:', documentId);
      setError('Invalid document ID - cannot use context-aware chat');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💬 Sending context-aware chat message:', {
        messageLength: message.length,
        documentId,
        historyLength: conversationHistory.length
      });

      const response = await fetch('/api/reading/chat-with-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          documentId,
          conversationHistory,
          maxContextTokens: 6000,
          includeMetadata: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      console.log('✅ Context-aware response received:', {
        responseLength: data.response.length,
        chunksUsed: data.context.chunksUsed,
        totalTokens: data.context.totalTokens
      });

      return data.response;
    } catch (err: any) {
      console.error('❌ Error in context-aware chat:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getContext,
    chatWithContext,
    isLoading,
    error
  };
}


