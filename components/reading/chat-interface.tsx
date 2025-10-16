"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, FileText, Upload, Sparkles, BookOpen } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
                  "Upload a document to start our conversation."
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
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={document ? `Ask me anything about "${document.title}"...` : "Upload a document to start chatting"}
            disabled={!document || isLoading || isContextLoading || isSummarizing}
            className="flex-1 text-sm rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 min-w-0"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading || isContextLoading || isSummarizing || isGeneratingFlashcards || !document}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        {!document && (
          <p className="text-sm text-muted-foreground mt-2 text-center font-medium">
            Open a document to ask questions
          </p>
        )}
      </div>
    </div>
  );
}
