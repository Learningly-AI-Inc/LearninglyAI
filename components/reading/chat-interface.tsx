"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, FileText, Upload, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocument } from './document-context';
import { useDocumentContext } from '@/hooks/use-document-context';
import { useDocumentSummarization } from '@/hooks/use-document-summarization';
import { FadeContent } from '@/components/react-bits/fade-content';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { ChatMessage } from '@/components/ui/chat-message';

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
        className="rounded-full text-sm px-4 py-2.5 hover:bg-blue-50 hover:text-blue-800 border-blue-200 text-blue-700 whitespace-nowrap flex items-center gap-2 transition-all duration-200 [&:hover]:text-blue-800 hover:shadow-md hover:scale-105 font-medium"
      >
        {icon}
        {text}
      </Button>
    </ClickSpark>
  );
}

export function ChatInterface() {
  const { messages, sendMessage, addMessage, isLoading, document } = useDocument();
  const { chatWithContext, isLoading: isContextLoading } = useDocumentContext();
  const { summarizeDocument, isLoading: isSummarizing } = useDocumentSummarization();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isContextLoading || isSummarizing) return;

    const message = inputValue.trim();
    setInputValue('');
    
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
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`
        });
      }
    } else {
      console.log('❌ Document ID is not a valid UUID, using regular chat:', document?.id);
      await sendMessage(message);
    }
  };

  const handleChipClick = async (chipText: string) => {
    // Handle special actions
    if (chipText === "summarize") {
      await handleSummarizeDocument();
      return;
    }

    if (document?.id && isValidUUID(document.id)) {
      try {
        // Add user message first
        addMessage({ role: 'user', content: chipText });
        
        const response = await chatWithContext(chipText, document.id, messages);
        if (response) {
          addMessage({ role: 'assistant', content: response });
        } else {
          addMessage({ 
            role: 'assistant', 
            content: 'Sorry, I encountered an issue processing your request. Please try again.'
          });
        }
      } catch (error) {
        console.error('❌ Context chat failed:', error);
        addMessage({ 
          role: 'assistant', 
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`
        });
      }
    } else {
      console.log('❌ Document ID is not a valid UUID, using regular chat for chip click:', document?.id);
      await sendMessage(chipText);
    }
  };

  const handleSummarizeDocument = async () => {
    if (!document?.id || !isValidUUID(document.id) || isSummarizing) return;

    try {
      console.log('📄 Starting document summarization with GPT-5');
      
      const result = await summarizeDocument(document.id, {
        summaryType: 'comprehensive',
        model: 'gpt-5'
      });

      if (result) {
        // Add the summary as a message to the chat
        const summaryMessage = `📄 **Document Summary**\n\n${result.summary}\n\n---\n*Generated using GPT-5 • ${result.metadata.tokensUsed} tokens used*`;
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
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !isLoading && !isContextLoading && !isSummarizing && (
          <FadeContent>
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">
                {document ? "Document loaded successfully! 🎉" : "Upload a document to start"}
              </h3>
              <p className="text-gray-600 text-sm mb-6 px-4 leading-relaxed">
                {document ? 
                  `I'm ready to help you with "${document.title}". Ask me anything or choose from the options below.` :
                  "Upload a document to start our conversation."
                }
              </p>
              
              {!document && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 mb-2 font-medium">💡 Try asking me math questions like:</p>
                  <div className="space-y-1 text-xs text-blue-700">
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
                  <p className="text-sm text-gray-500 font-medium">
                    Or type your own question below
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">
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
            <ChatMessage 
              content={message.content}
              role={message.role}
            />
          </div>
        ))}

        {(isLoading || isContextLoading || isSummarizing) && (
          <div className="flex justify-start mb-6">
            <div className="max-w-[95%] rounded-2xl px-4 py-3 bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600 font-medium">
                    {isSummarizing ? 'Summarizing with GPT-5...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={document ? `Ask me anything about "${document.title}"...` : "Upload a document to start chatting"}
            disabled={!document || isLoading || isContextLoading || isSummarizing}
            className="flex-1 text-sm rounded-xl border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 min-w-0"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading || isContextLoading || isSummarizing || !document}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        {!document && (
          <p className="text-sm text-gray-500 mt-2 text-center font-medium">
            Open a document to ask questions
          </p>
        )}
      </div>
    </div>
  );
}
