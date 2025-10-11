'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Archive,
  Search,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ChatInterface() {
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    createConversation,
    selectConversation,
    sendMessage,
    updateConversation,
    deleteConversation,
    clearError
  } = useChat();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation changes
  useEffect(() => {
    if (currentConversation) {
      inputRef.current?.focus();
    }
  }, [currentConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;

    setIsTyping(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      await createConversation({
        title: 'New Conversation',
        model_name: 'gpt-3.5-turbo'
      });
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      await selectConversation(conversationId);
    } catch (err) {
      console.error('Failed to select conversation:', err);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation(conversationId);
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={clearError}>Dismiss</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chats</h2>
            <Button
              onClick={handleNewConversation}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversation?.id === conversation.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent'
                }`}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {conversation.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {conversation.model_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement edit functionality
                      }}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conversation.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredConversations.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat to begin</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-background border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold">{currentConversation.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{currentConversation.model_name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(currentConversation.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="outline" size="sm">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-2 block">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-background border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isTyping}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim() || isTyping}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Welcome to Learningly AI Chat
              </h2>
              <p className="text-muted-foreground mb-4">
                Start a new conversation to begin learning with AI
              </p>
              <Button onClick={handleNewConversation} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
