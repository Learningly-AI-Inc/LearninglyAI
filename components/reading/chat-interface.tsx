"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, FileText, Upload, Sparkles, BookOpen, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocument } from './document-context';
import type { ChatMessage } from './document-context';
import { useDocumentContext } from '@/hooks/use-document-context';
import { useDocumentSummarization } from '@/hooks/use-document-summarization';
import { useFlashcards } from '@/hooks/use-flashcards';
import { FadeContent } from '@/components/react-bits/fade-content';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { ChatMessage as ChatMessageComponent } from '@/components/ui/chat-message';
import { Markdown } from '@/components/ui/markdown';
import { LoadingFacts } from './loading-facts';

interface ChipProps {
  text: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

function Chip({ text, onClick, icon }: ChipProps) {
  return (
    <ClickSpark>
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className="rounded-full text-sm px-4 py-2.5 hover:bg-primary/10 hover:text-primary border-border text-primary whitespace-nowrap flex items-center gap-2 transition-all duration-200 [&:hover]:text-primary hover:shadow-md hover:scale-105 font-medium"
      >
        {icon}
        {text}
      </Button>
    </ClickSpark>
  );
}

export function ChatInterface() {
  const { messages, sendMessage, addMessage, isLoading, document, setMessages } = useDocument();
  const { chatWithContext, isLoading: isContextLoading } = useDocumentContext();
  const { summarizeDocument, isLoading: isSummarizing } = useDocumentSummarization();
  const { generateFlashcards, isLoading: isGeneratingFlashcards } = useFlashcards();
  const [inputValue, setInputValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{id: string, file: File, status: 'uploading' | 'success' | 'error'}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prevent default browser behavior for file drops
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add event listeners to prevent default browser behavior
    window.document.addEventListener('dragenter', preventDefaults);
    window.document.addEventListener('dragover', preventDefaults);
    window.document.addEventListener('dragleave', preventDefaults);
    window.document.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.document.removeEventListener('dragenter', preventDefaults);
      window.document.removeEventListener('dragover', preventDefaults);
      window.document.removeEventListener('dragleave', preventDefaults);
      window.document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);


  // Drag and drop handlers - simplified like exam materials upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter for supported file types
    const supportedFiles = files.filter(file => {
      const validTypes = ['.pdf', '.txt', '.docx', '.doc', '.png', '.jpg', '.jpeg'];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(extension);
    });

    if (supportedFiles.length === 0) {
      addMessage({
        role: 'assistant',
        content: 'Sorry, I only support PDF, TXT, DOCX, DOC, PNG, JPG, and JPEG files.'
      });
      return;
    }

    // Process each file
    for (const file of supportedFiles) {
      await handleFileUpload(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    for (const file of Array.from(files)) {
      await handleFileUpload(file);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to uploading files
    setUploadingFiles(prev => [...prev, { id: fileId, file, status: 'uploading' }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const response = await fetch('/api/reading/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Update file status to success
      setUploadingFiles(prev => 
        prev.map(f => f.id === fileId ? { ...f, status: 'success' } : f)
      );

      // Add success message
      addMessage({
        role: 'assistant',
        content: `✅ Successfully uploaded "${file.name}". I can now help you with questions about this document!`
      });

      // Remove from uploading files after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      
      // Update file status to error
      setUploadingFiles(prev => 
        prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
      );

      // Add error message
      addMessage({
        role: 'assistant',
        content: `❌ Failed to upload "${file.name}". Please try again.`
      });

      // Remove from uploading files after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      }, 5000);
    }
  };

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(str);
    console.log(`🔍 UUID Validation: "${str}" is ${isValid ? 'VALID' : 'INVALID'} UUID`);
    return isValid;
  };

  const handleChipClick = (chipText: string) => {
    setInputValue(chipText);
    // Auto-submit the chip text
    setTimeout(() => {
      handleSubmit(new Event('submit') as any);
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isContextLoading || isSummarizing || isGeneratingFlashcards) return;

    const message = inputValue.trim();
    setInputValue('');
    
    // Check if this is a summarize action
    if (message.toLowerCase().includes('summarize') && document) {
      console.log('📄 Detected summarize action, triggering summarization...');

      // Add user message to chat
      addMessage({ role: 'user', content: message });

      try {
        // Check if document has a valid UUID (database-stored document)
        if (document.id && isValidUUID(document.id)) {
          console.log('📄 Using database document summarization for:', document.id);
          const result = await summarizeDocument(document.id, {
            summaryType: 'comprehensive',
            maxTokens: 2000,
            model: 'gpt-5'
          });

          if (result) {
            // Add the summary as a new message
            addMessage({
              role: 'assistant',
              content: `**Document Summary**\n\n${result.summary}`
            });
          } else {
            // Add error message
            addMessage({
              role: 'assistant',
              content: 'Sorry, I encountered an error while generating the summary. Please try again.'
            });
          }
        } else {
          // Use the simple text-based summarization for sample documents
          console.log('📄 Using text-based summarization for sample document');
          const response = await fetch('/api/reading/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: document.text,
              documentTitle: document.title
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.summary) {
              // Add the summary as a new message
              addMessage({
                role: 'assistant',
                content: `**Document Summary**\n\n${data.summary}`
              });
            } else {
              throw new Error('Failed to generate summary');
            }
          } else {
            throw new Error('Failed to generate summary');
          }
        }
      } catch (error: any) {
        console.error('❌ Summarization error:', error);
        // Add error message
        addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error while generating the summary: ${error.message}. Please try again.`
        });
      }
      return;
    }

    // Check if this is a flashcard action
    if ((message.toLowerCase().includes('flashcard') || message.toLowerCase().includes('flash card')) && document) {
      console.log('🃏 Detected flashcard action, triggering flashcard generation...');

      // Add user message to chat
      addMessage({ role: 'user', content: message });

      try {
        // Check if document has a valid UUID (database-stored document)
        if (document.id && isValidUUID(document.id)) {
          console.log('🃏 Using database document flashcard generation for:', document.id);
          const result = await generateFlashcards(document.id, {
            count: 8,
            difficulty: 'medium',
            focus: 'comprehensive'
          });

          if (result) {
            // Add the flashcard results as a new message
            addMessage({
              role: 'assistant',
              content: `**Flashcards Generated!**\n\nI've created ${result.flashcards.length} flashcards from your document "${result.metadata.title}".\n\n**Sample Cards:**\n\n${result.flashcards.slice(0, 3).map((card, index) =>
                `**Card ${index + 1}:**\n**Q:** ${card.front}\n**A:** ${card.back}\n`
              ).join('\n')}\n\nYou can view and study all flashcards in the Flashcards tab!`
            });
          } else {
            // Add error message
            addMessage({
              role: 'assistant',
              content: 'Sorry, I encountered an error while generating flashcards. Please try again.'
            });
          }
        } else {
          // For sample documents, show error
          addMessage({
            role: 'assistant',
            content: 'Flashcard generation requires a properly uploaded document. Please upload your document first.'
          });
        }
      } catch (error: any) {
        console.error('❌ Flashcard generation error:', error);
        // Add error message
        addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error while generating flashcards: ${error.message}. Please try again.`
        });
      }
      return;
    }
    
    // Use context-aware chat only if document has a valid UUID, otherwise fallback to regular chat
    console.log('🔍 Chat Debug Info:', {
      hasDocument: !!document,
      documentId: document?.id,
      documentTitle: document?.title,
      willUseContextChat: document?.id && isValidUUID(document.id)
    });
    
    if (document?.id && isValidUUID(document.id)) {
      console.log('✅ Using context-aware chat with valid UUID:', document.id);
      try {
        // Add user message to chat first
        addMessage({ role: 'user', content: message });
        
        const response = await chatWithContext(message, document.id, messages);
        console.log('🔍 Context response:', { response: response ? 'SUCCESS' : 'NULL', length: response?.length || 0 });
        
        if (response) {
          // Add AI response to chat
          addMessage({ role: 'assistant', content: response });
          console.log('✅ Context-aware chat completed successfully - NO FALLBACK');
          return; // Exit early to prevent fallback
        } else {
          console.log('❌ Context response was null/empty');
          addMessage({ 
            role: 'assistant', 
            content: 'Sorry, I encountered an issue processing your request. Please try again.'
          });
        }
      } catch (error) {
        console.error('❌ Context chat failed:', error);
        addMessage({ 
          role: 'assistant', 
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
        });
      }
    } else {
      console.log('❌ Document ID is not a valid UUID, using regular chat:', document?.id);
      await sendMessage(message);
    }
  };


  const handleSummarizeDocument = async () => {
    if (!document?.id || !isValidUUID(document.id) || isSummarizing) return;

    try {
      console.log('📄 Starting document summarization');
      
      const result = await summarizeDocument(document.id, {
        summaryType: 'comprehensive',
        model: 'gpt-5'
      });

      if (result) {
        // Add the summary as a message to the chat
        const summaryMessage = `📄 **Document Summary**\n\n${result.summary}`;
        await sendMessage(summaryMessage);
      }
    } catch (error) {
      console.error('❌ Error summarizing document:', error);
      await sendMessage('Sorry, I couldn\'t summarize the document. Please try again.');
    }
  };

  const quickActions = [
    {
      text: "Summarize this document",
      icon: <Sparkles className="h-3 w-3" />,
      action: "summarize"
    },
    {
      text: "What are the key points?",
      icon: <BookOpen className="h-3 w-3" />,
      action: "What are the key points?"
    },
    {
      text: "Explain the main concepts",
      icon: <FileText className="h-3 w-3" />,
      action: "Explain the main concepts"
    },
    {
      text: "Create flashcards",
      icon: <Sparkles className="h-3 w-3" />,
      action: "Create flashcards from this document"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Upload Progress Indicators */}
      {uploadingFiles.length > 0 && (
        <div className="absolute top-4 right-4 space-y-2 z-40">
          {uploadingFiles.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className={`flex items-center gap-3 bg-white dark:bg-gray-800 border rounded-lg px-4 py-3 shadow-lg max-w-sm ${
                uploadFile.status === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                uploadFile.status === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
              }`}
            >
              <File className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {uploadFile.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadFile.status === 'uploading' && 'Uploading...'}
                  {uploadFile.status === 'success' && 'Uploaded successfully!'}
                  {uploadFile.status === 'error' && 'Upload failed'}
                </p>
              </div>
              {uploadFile.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {uploadFile.status === 'success' && (
                <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
              )}
              {uploadFile.status === 'error' && (
                <X className="h-4 w-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !isLoading && !isContextLoading && !isSummarizing && (
          <FadeContent>
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              {!document && (
                <h3 className="font-bold text-foreground mb-2 text-lg">Upload a document to start</h3>
              )}
              <p className="text-muted-foreground text-sm mb-6 px-4 leading-relaxed">
                {document ? 
                  `I'm ready to help you with "${document.title}". Ask me anything or choose from the options below.` :
                  "Start a conversation by typing a message or drag & drop files into the input box below to upload them!"
                }
              </p>
              
              {!document && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-primary mb-2 font-medium">💡 Try asking me math questions like:</p>
                  <div className="space-y-1 text-xs text-primary/80">
                    <p>• "What is the quadratic formula?"</p>
                    <p>• "Explain Euler's identity"</p>
                    <p>• "How do I solve $x^2 + 5x + 6 = 0$?"</p>
                  </div>
                </div>
              )}
              
              {document ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {quickActions.map((action, index) => (
                      <Chip 
                        key={index}
                        text={action.text} 
                        onClick={() => handleChipClick(action.action)}
                        icon={action.icon}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Or type your own question below
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No document loaded. Please upload a document to start chatting.
                  </p>
                </div>
              )}
            </div>
          </FadeContent>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
          >
            <div className="max-w-[95%]">
              <ChatMessageComponent 
                content={message.content}
                role={message.role}
              />
              {message.chips && message.chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.chips.map((chip, chipIndex) => (
                    <Chip
                      key={chipIndex}
                      text={chip}
                      onClick={() => handleChipClick(chip)}
                      icon={chip.toLowerCase().includes('summarize') ? <Sparkles className="h-3 w-3" /> : 
                            chip.toLowerCase().includes('flashcard') ? <BookOpen className="h-3 w-3" /> : 
                            <FileText className="h-3 w-3" />}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {(isLoading || isContextLoading || isSummarizing || isGeneratingFlashcards) && (
          <LoadingFacts 
            isLoading={true}
            loadingType={
              isSummarizing ? 'summarizing' : 
              isGeneratingFlashcards ? 'generating' : 
              'thinking'
            }
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-background">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div 
            className={`flex-1 relative transition-colors duration-200 ${
              isDragOver ? 'bg-blue-50 dark:bg-blue-950/20' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              // If no document is loaded, open file picker as fallback
              if (!document) {
                fileInputRef.current?.click();
              }
            }}
          >
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isDragOver 
                  ? "Drop file here to upload..." 
                  : document 
                    ? `Ask me anything about "${document.title}"...` 
                    : "Message Learningly... (or drag & drop files here)"
              }
              disabled={isLoading || isContextLoading || isSummarizing}
              className={`w-full text-sm rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 min-w-0 ${
                isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
              }`}
            />
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-xl pointer-events-none">
                <div className="text-center">
                  <Upload className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Drop file here to upload
                  </p>
                </div>
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading || isContextLoading || isSummarizing || isGeneratingFlashcards}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        <p className="text-sm text-muted-foreground mt-2 text-center font-medium">
          Drag & drop files into the input box above to upload
        </p>
      </div>
      
      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.docx,.doc,.png,.jpg,.jpeg"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
