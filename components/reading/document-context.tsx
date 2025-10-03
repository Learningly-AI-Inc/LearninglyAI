"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useSupabase } from '@/hooks/use-supabase';

interface DocumentData {
  id: string;
  title: string;
  text: string;
  metadata: {
    originalFileName: string;
    fileSize: number;
    fileType: string;
    mimeType: string;
    pages: number;
    textLength: number;
    uploadedAt: string;
    processingNotes?: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  chips?: string[];
}

interface UploadProgress {
  stage: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface DocumentContextType {
  // Document state
  document: DocumentData | null;
  setDocument: (doc: DocumentData | null) => void;
  
  // Chat state
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  
  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  uploadProgress: UploadProgress;
  
  // Actions
  uploadDocument: (file: File) => Promise<{ fileUrl?: string; documentId?: string; title?: string }>;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  resetUpload: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function useDocument() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}

interface DocumentProviderProps {
  children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const lastDocumentIdRef = useRef<string | null>(null);
  const supabaseClient = useSupabase();
  

  const addMessage = React.useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Persist messages per-document so UI state is resilient to transient remounts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = document?.id ? `learningly_reading_messages_${document.id}` : 'learningly_reading_messages';
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages));
      // Also keep a generic key for quick restore between docs
      window.sessionStorage.setItem('learningly_reading_messages', JSON.stringify(messages));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [messages, document?.id]);

  // Restore messages when current document changes or on first mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentId = document?.id || null;
    if (lastDocumentIdRef.current === currentId) return;
    lastDocumentIdRef.current = currentId;
    try {
      const storageKey = currentId ? `learningly_reading_messages_${currentId}` : 'learningly_reading_messages';
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [document?.id]);

  const resetUpload = React.useCallback(() => {
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: ''
    });
    setIsLoading(false);
  }, []);

  const uploadDocument = React.useCallback(async (file: File) => {
    console.log('🚀 Starting document upload process');
    
    setIsLoading(true);
    setUploadProgress({
      stage: 'uploading',
      progress: 10,
      message: 'Preparing upload...'
    });

    try {
      // Validate file on client side first
      if (!file) {
        throw new Error('No file selected');
      }

      if (file.size === 0) {
        throw new Error('File is empty');
      }

      if (file.size > 30 * 1024 * 1024) {
        throw new Error('File size exceeds 30MB limit');
      }

      const allowedExtensions = ['pdf', 'txt', 'docx'];
      const fileExtension = file.name.toLowerCase().split('.').pop() || '';
      
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`File type .${fileExtension} not supported. Please use PDF, TXT, or DOCX files.`);
      }

      console.log('✅ Client-side validation passed');
      
      setUploadProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading file...'
      });

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 Sending request to /api/reading/upload');

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('/api/reading/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      setUploadProgress({
        stage: 'processing',
        progress: 70,
        message: 'Processing document...'
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
        }
        
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Upload failed');
      }

      const data = await response.json();
      console.log('✅ Upload successful:', data);

      if (!data.success) {
        throw new Error(data.error || 'Upload was not successful');
      }

      // Use server-provided extracted text (client-side PDF parsing disabled due to webpack issues)
      const extractedText = data.text || '';
      const pageCount = data.metadata?.pages || 1;

      // Create document data with extracted text
      const documentData: DocumentData = {
        id: data.documentId,
        title: data.metadata.title,
        text: extractedText,
        metadata: {
          ...data.metadata,
          pages: pageCount,
          textLength: extractedText.length
        },
      };

      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      });

      setDocument(documentData);
      setIsChatOpen(true);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send initial message to AI - Let chat interface handle this with proper API
      console.log('🤖 Document ready for chat analysis');
      // Note: Initial message will be handled by chat interface with context-aware API
      
      // Return the file URL and metadata for navigation
      return {
        fileUrl: data.fileUrl,
        documentId: data.documentId,
        title: data.metadata?.title || file.name
      };
      
    } catch (error: any) {
      console.error('💥 Upload failed:', error);

      // If body too large on Vercel (413), fall back to direct Storage upload -> fileUrl processing
      const isPayloadTooLarge = /413|payload\s*too\s*large/i.test(error?.message || '')
      if (isPayloadTooLarge) {
        try {
          setUploadProgress({ stage: 'uploading', progress: 40, message: 'Uploading to storage…' })

          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          // Prefix with user ID to satisfy storage RLS policies in production
          const { data: authData, error: authError } = await supabaseClient.auth.getUser()
          if (authError || !authData?.user?.id) throw new Error('Not authenticated')
          const userPrefix = authData.user.id
          const path = `${userPrefix}/${Date.now()}-${safeName}`
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('reading-documents')
            .upload(path, file, { upsert: false })
          if (uploadError) throw uploadError

          const { data: urlData } = supabaseClient.storage
            .from('reading-documents')
            .getPublicUrl(path)

          if (!urlData?.publicUrl) throw new Error('Failed to get public URL')

          setUploadProgress({ stage: 'processing', progress: 60, message: 'Processing document…' })

          const fd = new FormData()
          fd.append('fileUrl', urlData.publicUrl)
          const resp2 = await fetch('/api/reading/upload', { method: 'POST', body: fd })
          if (!resp2.ok) {
            let errData: any = null
            try { errData = await resp2.json() } catch {}
            throw new Error(errData?.error || errData?.details || `Upload failed with status ${resp2.status}`)
          }
          const data = await resp2.json()

          const extractedText = data.text || ''
          const pageCount = data.metadata?.pages || 1
          const documentData: DocumentData = {
            id: data.documentId,
            title: data.metadata.title,
            text: extractedText,
            metadata: {
              ...data.metadata,
              pages: pageCount,
              textLength: extractedText.length
            },
          }

          setUploadProgress({ stage: 'complete', progress: 100, message: 'Upload complete!' })
          setDocument(documentData)
          setIsChatOpen(true)

          await new Promise(resolve => setTimeout(resolve, 500))
          return { fileUrl: data.fileUrl, documentId: data.documentId, title: data.metadata?.title || file.name }
        } catch (fallbackError: any) {
          console.error('💥 Fallback upload failed:', fallbackError)
          setUploadProgress({ stage: 'error', progress: 0, message: fallbackError.message || 'Upload failed' })
          throw fallbackError
        }
      }

      setUploadProgress({ stage: 'error', progress: 0, message: error.message || 'Upload failed' })
      throw error
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const sendMessage = React.useCallback(async (content: string) => {
    if (!content.trim()) return;

    console.log('💬 Sending message:', content);

    // Add user message
    addMessage({ role: 'user', content });
    setIsLoading(true);

    try {
      const response = await fetch('/api/reading/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          documentText: document?.text,
          documentTitle: document?.title,
          conversationHistory: messages,
          isFirstMessage: messages.length === 0 && document,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`Chat request failed with status ${response.status}`);
        }
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Extract chips from response if they exist
      const chipPattern = /\[([^\]]+)\]/g;
      const chips = [];
      let match;
      while ((match = chipPattern.exec(data.response)) !== null) {
        chips.push(match[1]);
      }

      // Add AI response
      addMessage({ 
        role: 'assistant', 
        content: data.response,
        chips: chips.length > 0 ? chips : undefined
      });

    } catch (error: any) {
      console.error('💥 Chat error:', error);
      addMessage({ 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error.message}. Please try again.` 
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, document, messages]);

  const clearChat = React.useCallback(() => {
    setMessages([]);
  }, []);

  // Memoize the context value to prevent infinite re-renders
  const value: DocumentContextType = React.useMemo(() => ({
    document,
    setDocument,
    messages,
    setMessages,
    addMessage,
    isLoading,
    setIsLoading,
    isChatOpen,
    setIsChatOpen,
    uploadProgress,
    uploadDocument,
    sendMessage,
    clearChat,
    resetUpload,
  }), [
    document,
    messages,
    isLoading,
    isChatOpen,
    uploadProgress,
    addMessage,
    uploadDocument,
    sendMessage,
    clearChat,
    resetUpload,
  ]);

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}