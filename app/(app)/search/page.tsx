"use client"

import * as React from "react"
import { Send, Bot, Copy, ThumbsUp, ThumbsDown, RotateCcw, Sparkles, Search, Plus, Trash2, Mic, Square, ChevronRight, Zap, Brain, X, Menu, FileText, Edit2, Save, Check, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

import { useAuthContext } from "@/components/auth/auth-provider"
import { Markdown } from "@/components/ui/markdown"
import { toast } from "sonner"
// Removed useChat hook dependency to fix chat_preferences table error

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
  isTyping?: boolean
}

interface Conversation {
  id: string
  title: string
  model_used: 'gemini-2.5-flash' | 'gpt-5-mini'
  created_at: string
  updated_at: string
}

function QuickTip({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
      {icon}
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

const SearchPage = () => {
  const { user, loading } = useAuthContext()
  
  // Removed useChat hook dependency - using direct API calls instead

  // Local state for UI
  const [messages, setMessages] = React.useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = React.useState('')
  const [attachedDocs, setAttachedDocs] = React.useState<Array<{ id: string; name: string; url: string; status: 'uploading' | 'ready' | 'error' }>>([])
  const [isTyping, setIsTyping] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<'gemini-2.5-flash' | 'gpt-5-mini' | 'gpt-5' | 'gpt-5-nano' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite' | 'gpt-5-thinking-pro' | 'grok-3' | 'deepseek-v3' | 'llama-3.1'>('gemini-2.5-flash')
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [conversationSidebarCollapsed, setConversationSidebarCollapsed] = React.useState(false)
  const [showModelMenu, setShowModelMenu] = React.useState(false)
  const [abortController, setAbortController] = React.useState<AbortController | null>(null)
  const [deletingConversationId, setDeletingConversationId] = React.useState<string | null>(null)
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState('')
  const [editingContent, setEditingContent] = React.useState('')
  const [isSavingMessage, setIsSavingMessage] = React.useState(false)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversations on mount and when Supabase conversations change
  React.useEffect(() => {
    if (user?.id && !loading) {
      loadConversations()
    }
  }, [user?.id, loading])

  // Removed chat error handling since we're not using the chat hook

  // Removed Supabase chat setup since we're using direct API calls

  // Debug: Monitor state changes
  React.useEffect(() => {
    console.log('💬 [SEARCH PAGE] State changed:', {
      conversationsCount: conversations.length,
      messagesCount: messages.length,
      selectedConversationId,
      isTyping,
      isLoading,
      selectedModel,
      currentMessageLength: currentMessage.length
    })
  }, [conversations, messages, selectedConversationId, isTyping, isLoading, selectedModel, currentMessage])

  const loadConversations = async () => {
    if (!user?.id || loading) {
      console.log('💬 [SEARCH PAGE] loadConversations: No user ID or still loading:', { userId: user?.id, loading })
      return
    }

    console.log('💬 [SEARCH PAGE] loadConversations: Starting for user:', user.id)
    
    try {
      // Fetch conversations directly from search API
      const response = await fetch(`/api/search/enhanced?userId=${user.id}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`)
      }

      const data = await response.json()
      console.log('💬 [SEARCH PAGE] loadConversations: API response:', data)

      if (data.conversations) {
        console.log('💬 [SEARCH PAGE] loadConversations: Converting search conversations:', {
          apiCount: data.conversations.length
        })
        
        setConversations(data.conversations)
        console.log('💬 [SEARCH PAGE] loadConversations: Conversations updated in state')
      } else {
        setConversations([])
        console.log('💬 [SEARCH PAGE] loadConversations: No conversations found')
      }
    } catch (error: any) {
      // Improved error handling with fallbacks
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
      const errorStack = error?.stack || 'No stack trace available'
      
      console.error('💬 [SEARCH PAGE] loadConversations: Error:', {
        error: errorMessage,
        stack: errorStack,
        errorType: error?.constructor?.name || 'Unknown',
        errorKeys: error ? Object.keys(error) : []
      })
      
      setConversations([])
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    if (!user?.id || loading) {
      console.log('💬 [SEARCH PAGE] loadConversationMessages: No user ID or still loading:', { userId: user?.id, loading })
      return
    }

    console.log('💬 [SEARCH PAGE] loadConversationMessages: Starting for conversation:', conversationId)
    
    try {
      console.log('💬 [SEARCH PAGE] loadConversationMessages: Setting loading state...')
      setIsLoading(true)

      // Fetch messages directly from search API instead of using chat hook
      const response = await fetch(`/api/search/enhanced?userId=${user.id}&conversationId=${conversationId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`)
      }

      const data = await response.json()
      console.log('💬 [SEARCH PAGE] loadConversationMessages: API response:', data)

      if (data.messages && data.messages.length > 0) {
        // Convert search messages to local format
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          sources: msg.sources || []
        }))

        console.log('💬 [SEARCH PAGE] loadConversationMessages: Converting search messages:', {
          apiCount: data.messages.length,
          localCount: formattedMessages.length
        })

        setMessages(formattedMessages)
        console.log('💬 [SEARCH PAGE] loadConversationMessages: Messages loaded successfully')
      } else {
        // If no messages found in existing conversation, just show empty state
        console.log('💬 [SEARCH PAGE] loadConversationMessages: No messages found in this conversation')
        setMessages([])
      }
    } catch (error: any) {
      // Improved error handling with fallbacks
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
      const errorStack = error?.stack || 'No stack trace available'
      
      console.error('💬 [SEARCH PAGE] loadConversationMessages: Error:', {
        error: errorMessage,
        stack: errorStack,
        errorType: error?.constructor?.name || 'Unknown',
        errorKeys: error ? Object.keys(error) : []
      })
      
      // Show empty state on error when loading existing conversation
      setMessages([])
    } finally {
      console.log('💬 [SEARCH PAGE] loadConversationMessages: Clearing loading state')
      setIsLoading(false)
    }
  }

  const sendMessage = async (message: string) => {
    if (!user?.id || loading || !message.trim() || isTyping) {
      console.log('💬 [SEARCH PAGE] Send message blocked:', {
        hasUser: !!user?.id,
        loading,
        hasMessage: !!message.trim(),
        isTyping
      })
      return
    }

    // Prevent sending while attachments are still uploading
    const hasUploading = attachedDocs.some(d => d.status === 'uploading')
    if (hasUploading) {
      toast.info('Please wait for uploads to finish')
      return
    }

    console.log('💬 [SEARCH PAGE] Sending message:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      model: selectedModel,
      conversationId: selectedConversationId
    })

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    // Add typing indicator message
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])
    setIsTyping(true)

    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    console.log('💬 [SEARCH PAGE] Added user message and typing indicator')

    try {
      // Note: Conversation creation and message saving now handled by the search API

      console.log('💬 [SEARCH PAGE] Making API request with model:', selectedModel)
      let response: Response
      try {
        // Only include IDs of attachments that are fully ready
        const readyAttachmentIds = attachedDocs
          .filter(d => d.status === 'ready')
          .map(d => d.id)

        response = await fetch('/api/search/enhanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message.trim(),
            conversationId: selectedConversationId,
            model: selectedModel,
            attachedDocumentIds: readyAttachmentIds
          }),
          signal: controller.signal
        })
      } catch (fetchError: any) {
        console.error('💬 [SEARCH PAGE] Fetch request failed:', {
          error: fetchError?.message || 'Unknown fetch error',
          errorType: fetchError?.constructor?.name || 'Unknown',
          errorKeys: fetchError ? Object.keys(fetchError) : []
        })
        throw new Error(`Network error: ${fetchError?.message || 'Failed to connect to server'}`)
      }

      let data: any
      try {
        data = await response.json()
        console.log('💬 [SEARCH PAGE] API response received:', {
          ok: response.ok,
          status: response.status,
          hasResponse: !!data?.response,
          responseLength: data?.response?.length || 0,
          conversationId: data?.conversationId,
          dataKeys: data ? Object.keys(data) : []
        })
      } catch (parseError: any) {
        console.error('💬 [SEARCH PAGE] Failed to parse API response:', {
          error: parseError?.message || 'Unknown parse error',
          responseText: await response.text().catch(() => 'Could not read response text')
        })
        throw new Error('Invalid response from server')
      }

      if (response.ok && data?.response) {
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.response,
          timestamp: new Date(),
          sources: data.sources || []
        }

        // Replace the typing message with the actual response
        setMessages(prev => prev.map(msg =>
          msg.isTyping ? aiMessage : msg
        ))

        console.log('💬 [SEARCH PAGE] Assistant response message added to chat')
        // Clear attachments after send
        setAttachedDocs([])

        // Save AI response to Supabase
        if (selectedConversationId) {
          console.log('💬 [SEARCH PAGE] Saving assistant response to Supabase')
          // The AI response will be saved via the API route
        }
      } else if (response.ok) {
        // Response was OK but no content
        console.warn('💬 [SEARCH PAGE] API response OK but no content:', {
          data: data,
          hasResponse: !!data?.response,
          responseType: typeof data?.response
        })
        toast.error('Received empty response from the service')
        
        // Remove the typing message
        setMessages(prev => prev.filter(msg => !msg.isTyping))
      }

      // Update conversation ID if this is a new conversation (only if we have a response)
      if (response.ok && data?.response && !selectedConversationId && data?.conversationId) {
        console.log('💬 [SEARCH PAGE] New conversation detected:', data.conversationId)
        console.log('💬 [SEARCH PAGE] Previous selectedConversationId:', selectedConversationId)
        setSelectedConversationId(data.conversationId)
        console.log('💬 [SEARCH PAGE] New selectedConversationId set to:', data.conversationId)

        // Reload conversations to get the new one
        console.log('💬 [SEARCH PAGE] Reloading conversations to show new conversation...')
        try {
          await loadConversations()
        } catch (reloadError: any) {
          console.warn('💬 [SEARCH PAGE] Failed to reload conversations:', {
            error: reloadError?.message || 'Unknown reload error'
          })
          // Continue even if reload fails
        }
      } else if (response.ok && data?.response) {
        console.log('💬 [SEARCH PAGE] Using existing conversation:', selectedConversationId)
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorMessage = data?.error || `Server error: ${response.status} ${response.statusText}`
        console.error('💬 [SEARCH PAGE] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data: data
        })
        toast.error(errorMessage)
        
        // Remove the typing message on error
        setMessages(prev => prev.filter(msg => !msg.isTyping))
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('💬 [SEARCH PAGE] Request aborted by user')
        // Remove typing message when aborted
        setMessages(prev => prev.filter(msg => !msg.isTyping))
        toast.info('Message cancelled')
      } else {
        // Improved error handling with fallbacks
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
        const errorStack = error?.stack || 'No stack trace available'
        
        console.error('💬 [SEARCH PAGE] Network error:', {
          error: errorMessage,
          stack: errorStack,
          errorType: error?.constructor?.name || 'Unknown',
          errorKeys: error ? Object.keys(error) : []
        })
        
        // Show user-friendly error message
        toast.error(`Failed to send message: ${errorMessage}`)
      }
    } finally {
      setIsTyping(false)
      setAbortController(null)
      console.log('💬 [SEARCH PAGE] Message sending process completed')
    }
  }

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsTyping(false)
      // Remove typing message
      setMessages(prev => prev.filter(msg => !msg.isTyping))
      toast.info('Generation stopped')
    }
  }

  // Close model menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModelMenu && !(event.target as Element).closest('.model-menu')) {
        setShowModelMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showModelMenu])

  // Close model menu when pressing Escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showModelMenu) {
        setShowModelMenu(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showModelMenu])

  const handleSendMessage = () => {
    if (!currentMessage.trim() || isTyping || loading || !user?.id) return
    if (attachedDocs.some(d => d.status === 'uploading')) {
      toast.info('Please wait for uploads to finish')
      return
    }
    sendMessage(currentMessage.trim())
    setCurrentMessage('')
  }



  // Map new model names to database-allowed model names
  const mapModelToDatabaseModel = (model: string): 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-pro' | 'claude' => {
    const modelMapping: Record<string, 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-pro' | 'claude'> = {
      'gemini-2.5-flash': 'gemini-pro',
      'gemini-2.5-flash-lite': 'gemini-pro',
      'gemini-2.5-pro': 'gemini-pro',
      'gpt-5-mini': 'gpt-3.5-turbo',
      'gpt-5': 'gpt-4',
      'gpt-5-nano': 'gpt-3.5-turbo',
      'gpt-5-thinking-pro': 'gpt-4'
    }
    
    return modelMapping[model] || 'gpt-3.5-turbo' // Default fallback
  }

  const handleNewConversation = () => {
    if (loading || !user?.id) {
      console.log('💬 [SEARCH PAGE] handleNewConversation blocked - loading or no user:', { loading, userId: user?.id })
      return
    }

    console.log('💬 [SEARCH PAGE] handleNewConversation called')
    console.log('💬 [SEARCH PAGE] Previous state:', {
      selectedConversationId,
      messagesCount: messages.length,
      conversationsCount: conversations.length
    })

    setSelectedConversationId(null)
    setMessages([]) // Start with empty messages to show welcome card
    setAttachedDocs([])

    console.log('💬 [SEARCH PAGE] New conversation state set:', {
      selectedConversationId: null,
      messagesCount: 0,
      welcomeCardWillShow: true
    })
  }



  const handleConversationSelect = (conversationId: string | null) => {
    if (loading || !user?.id) {
      console.log('💬 [SEARCH PAGE] handleConversationSelect blocked - loading or no user:', { loading, userId: user?.id })
      return
    }

    console.log('💬 [SEARCH PAGE] handleConversationSelect called:', {
      conversationId,
      previousSelectedId: selectedConversationId,
      isNewConversation: conversationId === null
    })

    setSelectedConversationId(conversationId)

    if (conversationId) {
      console.log('💬 [SEARCH PAGE] Loading existing conversation messages:', conversationId)
      // Load messages directly from search API
      loadConversationMessages(conversationId).catch(error => {
        console.error('💬 [SEARCH PAGE] Error loading conversation messages:', error)
        toast.error('Failed to load conversation')
      })
    } else {
      console.log('💬 [SEARCH PAGE] Starting new conversation')
      handleNewConversation()
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (loading || !user?.id || deletingConversationId) {
      console.log('💬 [SEARCH PAGE] handleDeleteConversation blocked - loading, no user, or already deleting:', { loading, userId: user?.id, deletingConversationId })
      return
    }

    console.log('💬 [SEARCH PAGE] handleDeleteConversation called:', conversationId)
    console.log('💬 [SEARCH PAGE] State before deletion:', {
      conversationsCount: conversations.length,
      selectedConversationId,
      isSelectedConversation: selectedConversationId === conversationId
    })

    // Set loading state to prevent double-clicking
    setDeletingConversationId(conversationId)

    try {
      console.log('💬 [SEARCH PAGE] Deleting conversation via API...')
      
      // Call the DELETE API to remove conversation from database
      const response = await fetch(`/api/search/enhanced?conversationId=${conversationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to delete conversation: ${response.status}`)
      }

      console.log('💬 [SEARCH PAGE] Conversation deleted successfully from database')
      toast.success('Conversation deleted successfully')
      
      console.log('💬 [SEARCH PAGE] Removing conversation from local state...')
      // Remove from local state
      setConversations(prev => {
        const filtered = prev.filter(conv => conv.id !== conversationId)
        console.log('💬 [SEARCH PAGE] Conversations after filtering:', {
          count: filtered.length,
          removed: conversations.length - filtered.length
        })
        return filtered
      })

      // If this was the selected conversation, clear it
      if (selectedConversationId === conversationId) {
        console.log('💬 [SEARCH PAGE] Selected conversation was deleted, starting new conversation...')
        setSelectedConversationId(null)
        handleNewConversation()
      } else {
        console.log('💬 [SEARCH PAGE] Selected conversation was not deleted, keeping current selection')
      }

      toast.success('Conversation deleted')
    } catch (error: any) {
      console.error('💬 [SEARCH PAGE] DELETE error:', {
        error: error.message,
        stack: error.stack
      })
      toast.error('Failed to delete conversation')
    } finally {
      // Clear loading state
      setDeletingConversationId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Edit conversation title
  const handleEditConversationTitle = (conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId)
    setEditingTitle(currentTitle)
  }

  const handleSaveConversationTitle = async () => {
    if (!editingConversationId || !editingTitle.trim() || !user?.id) {
      return
    }

    try {
      // Note: Database update functionality removed - only updating local state for now
      console.log('🔍 [SEARCH PAGE] Conversation title updated locally (database update disabled)')

      // Update local conversations state
      setConversations(prev => prev.map(conv => 
        conv.id === editingConversationId 
          ? { ...conv, title: editingTitle.trim() }
          : conv
      ))

      toast.success('Conversation title updated')
      setEditingConversationId(null)
      setEditingTitle('')
    } catch (error: any) {
      console.error('Error updating conversation title:', error)
      toast.error('Failed to update conversation title')
    }
  }

  const handleCancelEditConversation = () => {
    setEditingConversationId(null)
    setEditingTitle('')
  }

  // Edit message content
  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditingContent(currentContent)
  }

  const handleSaveMessage = async () => {
    if (!editingMessageId || !editingContent.trim() || !user?.id) {
      console.error('🔍 [SEARCH PAGE] Invalid save parameters:', {
        hasMessageId: !!editingMessageId,
        hasContent: !!editingContent.trim(),
        hasUser: !!user?.id,
        contentLength: editingContent.trim().length
      })
      toast.error('Cannot save: Missing required information')
      return
    }

    if (editingContent.trim().length === 0) {
      toast.error('Message cannot be empty')
      return
    }

    if (isSavingMessage) {
      console.log('🔍 [SEARCH PAGE] Save already in progress, ignoring duplicate request')
      return
    }

    setIsSavingMessage(true)

    try {
      // Find the index of the message being edited
      const messageIndex = messages.findIndex(msg => msg.id === editingMessageId)
      if (messageIndex === -1) {
        toast.error('Message not found')
        return
      }

      // Remove all messages after the edited message (ChatGPT-style)
      const messagesUpToEdit = messages.slice(0, messageIndex + 1)
      
      // Update the edited message in the local state
      const updatedMessages = messagesUpToEdit.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: editingContent.trim() }
          : msg
      )

      // Set the messages to only include up to the edited message
      setMessages(updatedMessages)

      // If this is a user message, send it to get a new AI response
      const editedMessage = updatedMessages[messageIndex]
      if (editedMessage.type === 'user') {
        console.log('💬 [SEARCH PAGE] Regenerating response after edit...')
        
        // Add typing indicator
        const typingMessage: Message = {
          id: `typing-${Date.now()}`,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isTyping: true
        }
        setMessages(prev => [...prev, typingMessage])
        setIsTyping(true)

        // Send the edited message to get a new response
        try {
          const response = await fetch('/api/search/enhanced', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: editingContent.trim(),
              conversationId: selectedConversationId,
              model: selectedModel
            })
          })

          if (response.ok) {
            const data = await response.json()
            
            if (data?.response) {
              // Replace typing message with actual response
              setMessages(prev => prev.map(msg =>
                msg.isTyping ? {
                  id: `assistant-${Date.now()}`,
                  type: 'assistant',
                  content: data.response,
                  timestamp: new Date(),
                  sources: data.sources || []
                } : msg
              ))
              
              toast.success('Message edited and response regenerated')
            } else {
              // Remove typing message if no response
              setMessages(prev => prev.filter(msg => !msg.isTyping))
              toast.error('Failed to get new response')
            }
          } else {
            // Remove typing message on error
            setMessages(prev => prev.filter(msg => !msg.isTyping))
            const errorData = await response.json()
            toast.error(errorData.error || 'Failed to regenerate response')
          }
        } catch (regenerateError: any) {
          console.error('Error regenerating response:', regenerateError)
          setMessages(prev => prev.filter(msg => !msg.isTyping))
          toast.error('Failed to regenerate response')
        } finally {
          setIsTyping(false)
        }
      } else {
        // For assistant messages, just update without regenerating
        toast.success('Message updated')
      }

      // Note: Database update functionality removed - only updating local state for now
      console.log('🔍 [SEARCH PAGE] Message updated locally (database update disabled)')

      setEditingMessageId(null)
      setEditingContent('')
    } catch (error: any) {
      console.error('Error updating message:', error)
      toast.error('Failed to update message')
    } finally {
      setIsSavingMessage(false)
    }
  }

  const handleCancelEditMessage = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 text-muted-foreground">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">AI is thinking...</span>
    </div>
  )

  // Debug authentication status
  React.useEffect(() => {
    console.log('Search page: User authentication status:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      isLoading: loading
    })
  }, [user, loading])

  // Format date utility for conversation sidebar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }



  return (
    <div className="h-screen w-full bg-gradient-to-b from-blue-50 to-white text-slate-900">
      <div className="flex h-full w-full">
        {/* Conversation Sidebar - Disabled on desktop for single-column layout */}
        <aside className="hidden">
          <div className="flex items-center gap-2 px-3 h-12 border-b flex-shrink-0">
            {!conversationSidebarCollapsed && (
              <div className="font-medium text-sm">Conversations</div>
            )}
            <Button
              onClick={handleNewConversation}
              variant="outline"
              size="sm"
              className={`${conversationSidebarCollapsed ? 'w-8 h-8 p-0' : 'ml-auto h-8'}`}
              disabled={isLoading || loading || !user?.id}
            >
              {conversationSidebarCollapsed ? (
                <Plus className="h-4 w-4" />
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </>
              )}
            </Button>
            <button
              onClick={() => setConversationSidebarCollapsed(!conversationSidebarCollapsed)}
              className="ml-auto rounded-lg p-1 hover:bg-slate-100"
              aria-label="Toggle conversation sidebar"
            >
              <ChevronRight className={`h-4 w-4 ${conversationSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto px-2 py-1">
              <div className="space-y-1">
                <AnimatePresence>
                  {conversations.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                        selectedConversationId === conversation.id 
                          ? 'bg-slate-100' 
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleConversationSelect(conversation.id)}
                      >
                        {conversationSidebarCollapsed ? (
                          <div className="w-full flex justify-center">
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              {editingConversationId === conversation.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveConversationTitle()
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditConversation()
                                      }
                                    }}
                                    className="text-sm bg-white border border-slate-300 rounded px-1 py-0.5 flex-1"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveConversationTitle}
                                    className="p-0.5 rounded hover:bg-green-100 text-green-600"
                                    title="Save"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={handleCancelEditConversation}
                                    className="p-0.5 rounded hover:bg-red-100 text-red-600"
                                    title="Cancel"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-900 truncate">
                                  {conversation.title}
                                </div>
                              )}
                              <div className="text-xs text-slate-500">
                                {formatDate(conversation.updated_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {editingConversationId !== conversation.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditConversationTitle(conversation.id, conversation.title)
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 transition"
                                  title="Edit title"
                                >
                                  <Edit2 className="h-3 w-3 text-slate-400" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteConversation(conversation.id)
                                }}
                                disabled={deletingConversationId === conversation.id}
                                className="p-1 rounded hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete conversation"
                              >
                                {deletingConversationId === conversation.id ? (
                                  <div className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {loading && !conversationSidebarCollapsed && (
                  <div className="px-3 py-4 space-y-3">
                    {/* Loading skeleton for conversations */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-slate-200 rounded-lg p-3">
                          <div className="h-4 bg-slate-300 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-slate-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {conversations.length === 0 && !loading && !conversationSidebarCollapsed && (
                  <div className="text-center py-6 text-slate-500">
                    <p className="text-sm">No conversations yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Conversation Sidebar - Overlay (all breakpoints) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20" 
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar */}
            <aside className="absolute left-0 top-0 h-full w-[280px] bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-200 ease-in-out">
              <div className="flex items-center gap-2 px-3 h-12 border-b flex-shrink-0">
                <div className="font-medium text-sm">Conversations</div>
                <Button
                  onClick={handleNewConversation}
                  variant="outline"
                  size="sm"
                  className="ml-auto h-8"
                  disabled={isLoading || loading || !user?.id}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-2 rounded-lg p-1 hover:bg-slate-100"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto px-2 py-1">
                  <div className="space-y-1">
                    <AnimatePresence>
                      {conversations.map((conversation) => (
                        <motion.div
                          key={conversation.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                            selectedConversationId === conversation.id 
                              ? 'bg-slate-100' 
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            handleConversationSelect(conversation.id);
                            setSidebarOpen(false); // Close sidebar after selection
                          }}
                          >
                            <div className="flex-1 min-w-0">
                              {editingConversationId === conversation.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveConversationTitle()
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditConversation()
                                      }
                                    }}
                                    className="text-sm bg-white border border-slate-300 rounded px-1 py-0.5 flex-1"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveConversationTitle}
                                    className="p-0.5 rounded hover:bg-green-100 text-green-600"
                                    title="Save"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={handleCancelEditConversation}
                                    className="p-0.5 rounded hover:bg-red-100 text-red-600"
                                    title="Cancel"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-900 truncate">
                                  {conversation.title}
                                </div>
                              )}
                              <div className="text-xs text-slate-500">
                                {formatDate(conversation.updated_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {editingConversationId !== conversation.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditConversationTitle(conversation.id, conversation.title)
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 transition"
                                  title="Edit title"
                                >
                                  <Edit2 className="h-3 w-3 text-slate-400" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conversation.id);
                                }}
                                disabled={deletingConversationId === conversation.id}
                                className="p-1 rounded hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete conversation"
                              >
                                {deletingConversationId === conversation.id ? (
                                  <div className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {loading && (
                      <div className="px-3 py-4 space-y-3">
                        {/* Loading skeleton for conversations */}
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="bg-slate-200 rounded-lg p-3">
                              <div className="h-4 bg-slate-300 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-slate-300 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {conversations.length === 0 && !loading && (
                      <div className="text-center py-6 text-slate-500">
                        <p className="text-sm">No conversations yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col pb-32">
          {/* Top bar */}
          <div className="h-12 bg-white border-b flex items-center gap-3 px-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="rounded-lg p-2 hover:bg-slate-100" 
              aria-label="Toggle conversation sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-1.5 w-full max-w-sm">
              <Search className="h-4 w-4" />
              <input className="bg-transparent outline-none text-sm w-full" placeholder="Search conversations..."/>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Stop button moved to chat interface */}
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 relative" style={{ paddingBottom: '200px' }}>
            <div className="mx-auto max-w-3xl">
              {!selectedConversationId && messages.length === 0 && (
                <div className="flex items-center justify-center min-h-[60vh] sm:min-h-[65vh] text-center select-none">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ask Anything, I am here to answer!</h1>
                    <p className="text-sm text-slate-500 mt-1">I’ll help with answers, explanations, and examples.</p>
                  </div>
                </div>
              )}
              {/* Messages */}
              <div className="mt-3 space-y-4">
              {/* Loading state for messages */}
              {loading && selectedConversationId && messages.length === 0 && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 ${
                          i % 2 === 0 ? 'bg-slate-200' : 'bg-white border'
                        }`}>
                          <div className="h-4 bg-slate-300 rounded w-full mb-2"></div>
                          <div className="h-4 bg-slate-300 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-slate-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    {message.type === 'user' ? (
                      <div className="flex justify-end mb-8">
                        <div className="bg-slate-200 text-slate-700 rounded-2xl px-4 py-2 text-sm max-w-[80%] group/user">
                          {editingMessageId === message.id ? (
                            <div className="w-full">
                              {/* ChatGPT-style editing interface */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="w-full bg-transparent outline-none text-sm resize-none min-h-[60px]"
                                  placeholder="Edit your message..."
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-3">
                                  <button
                                    onClick={handleCancelEditMessage}
                                    className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveMessage}
                                    disabled={isSavingMessage}
                                    className="px-4 py-2 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                                  >
                                    {isSavingMessage ? (
                                      <>
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      'Send'
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group/user-bubble">
                              <span>{message.content}</span>
                              {/* Action buttons positioned with better spacing to avoid overlap */}
                              <div className="absolute -bottom-8 right-0 flex items-center gap-1 opacity-0 group-hover/user-bubble:opacity-100 transition-opacity bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm z-10">
                                <button
                                  onClick={() => copyToClipboard(message.content)}
                                  className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                                  title="Copy message"
                                >
                                  <Copy className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" />
                                </button>
                                <button
                                  onClick={() => handleEditMessage(message.id, message.content)}
                                  className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                                  title="Edit message"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {message.isTyping ? (
                            <TypingIndicator />
                          ) : (
                            <>
                              {editingMessageId === message.id ? (
                                <div className="w-full">
                                  {/* ChatGPT-style editing interface */}
                                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                    <textarea
                                      value={editingContent}
                                      onChange={(e) => setEditingContent(e.target.value)}
                                      className="w-full bg-transparent outline-none text-sm resize-none min-h-[120px]"
                                      placeholder="Edit the AI response..."
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-3">
                                      <button
                                        onClick={handleCancelEditMessage}
                                        className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={handleSaveMessage}
                                        disabled={isSavingMessage}
                                        className="px-4 py-2 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                                      >
                                        {isSavingMessage ? (
                                          <>
                                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          'Send'
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="text-slate-900">
                                    <Markdown>{message.content}</Markdown>
                                  </div>
                                  
                                  {/* Simplified Message Actions - Copy only */}
                                  <div className="flex items-center gap-0.5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-1.5 py-1 shadow-sm w-fit z-10">
                                    <button
                                      onClick={() => copyToClipboard(message.content)}
                                      className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                                      title="Copy message"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" />
                                    </button>
                                  </div>
                                </>
                              )}
                              
                              {/* Sources */}
                              {message.sources && message.sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                  <p className="text-xs text-slate-500 mb-2">Sources:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {message.sources.map((source, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                        <FileText className="h-3 w-3 mr-1" />
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Composer pinned to viewport bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200">
            <div className="px-3 sm:px-4 py-4">
              <div className="mx-auto max-w-3xl">
                <div className="bg-white/95 border rounded-[28px] px-4 py-3 shadow-sm">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 px-1 sm:px-2 py-2">
                      <textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder={loading ? "Loading..." : "Message Learningly…"}
                        rows={1}
                        className="w-full resize-none outline-none text-sm bg-transparent leading-6 max-h-40"
                        disabled={isTyping || loading || !user?.id}
                      />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                        {/* Attachment chips */}
                        {attachedDocs.length > 0 && (
                          <div className="flex flex-wrap gap-2 w-full">
                            {attachedDocs.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white shadow-sm text-xs">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="truncate max-w-[180px]" title={doc.name}>{doc.name}</span>
                                {doc.status === 'uploading' && (
                                  <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                                )}
                                {doc.status === 'error' && (
                                  <span className="text-red-600">Failed</span>
                                )}
                                <button
                                  onClick={() => setAttachedDocs(prev => prev.filter(d => d.id !== doc.id))}
                                  className="ml-1 text-slate-500 hover:text-slate-700"
                                  aria-label="Remove attachment"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Professional Model Selector */}
                        <div className="relative model-menu w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowModelMenu((s) => !s)}
                            className="h-8 px-3 text-xs border-slate-200 bg-white hover:bg-slate-50 w-full sm:min-w-[140px] justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {selectedModel.startsWith('gemini') ? (
                                <Zap className="h-3 w-3 text-purple-600" />
                              ) : (
                                <Brain className="h-3 w-3 text-blue-600" />
                              )}
                              <span className="truncate font-medium">
                                {selectedModel.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            <ChevronRight className={`h-3 w-3 transition-transform ${showModelMenu ? 'rotate-90' : ''}`} />
                          </Button>
                          {showModelMenu && (
                            <div className="absolute left-0 sm:left-0 right-0 sm:right-auto bottom-full mb-2 w-full sm:w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-[60]">
                              <div className="p-2 border-b border-slate-100">
                                <div className="text-xs font-medium text-slate-600 px-2 py-1">Select AI Model</div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {/* GPT-5 Models */}
                                <div className="px-2 py-1">
                                  <div className="text-xs font-medium text-slate-500 px-2 py-1 mb-1 flex items-center gap-1">
                                    <Brain className="h-3 w-3" />
                                    GPT-5 Models
                                  </div>
                                  {[
                                    { id: 'gpt-5', name: 'GPT-5', desc: 'Most capable model' },
                                    { id: 'gpt-5-mini', name: 'GPT-5 Mini', desc: 'Fast and efficient' },
                                    { id: 'gpt-5-nano', name: 'GPT-5 Nano', desc: 'Lightweight option' },
                                    { id: 'gpt-5-thinking-pro', name: 'GPT-5 Thinking Pro', desc: 'Advanced reasoning' }
                                  ].map((model) => (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        setSelectedModel(model.id as any);
                                        setShowModelMenu(false);
                                      }}
                                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors rounded-lg ${
                                        selectedModel === model.id ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-sm font-medium">{model.name}</div>
                                          <div className="text-xs text-slate-500">{model.desc}</div>
                                        </div>
                                        {selectedModel === model.id && (
                                          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Gemini Models */}
                                <div className="px-2 py-1">
                                  <div className="text-xs font-medium text-slate-500 px-2 py-1 mb-1 flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    Gemini Models
                                  </div>
                                  {[
                                    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Most capable Gemini' },
                                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Fast and efficient' },
                                    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', desc: 'Lightweight option' }
                                  ].map((model) => (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        setSelectedModel(model.id as any);
                                        setShowModelMenu(false);
                                      }}
                                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors rounded-lg ${
                                        selectedModel === model.id ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-sm font-medium">{model.name}</div>
                                          <div className="text-xs text-slate-500">{model.desc}</div>
                                        </div>
                                        {selectedModel === model.id && (
                                          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>

                                {/* Other Providers (Llama, Claude, Grok, DeepSeek) – mapped to closest engines */}
                                <div className="px-2 py-1">
                                  <div className="text-xs font-medium text-slate-500 px-2 py-1 mb-1">Other Providers</div>
                                  {[
                                    { id: 'llama-3.1', name: 'Llama 3.1', map: 'gpt-5-mini' },
                                    { id: 'claude-3.7', name: 'Claude 3.7', map: 'gpt-5' },
                                    { id: 'grok-3', name: 'Grok 3', map: 'gpt-5-mini' },
                                    { id: 'deepseek-v3', name: 'DeepSeek V3', map: 'gpt-5-nano' }
                                  ].map((model) => (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        // Store the displayed provider id; API will map internally
                                        setSelectedModel(model.id as any);
                                        setShowModelMenu(false);
                                      }}
                                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors rounded-lg ${
                                        (selectedModel === model.id || selectedModel === (model.map as any)) ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-sm font-medium">{model.name}</div>
                                          <div className="text-xs text-slate-500">Maps to {model.map}</div>
                                        </div>
                                        {(selectedModel === model.id || selectedModel === (model.map as any)) && (
                                          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Upload document like popular LLMs */}
                        <label className="inline-flex items-center justify-center h-8 px-3 text-xs border border-slate-200 bg-white hover:bg-slate-50 rounded-md cursor-pointer w-full sm:w-auto">
                          <input
                            type="file"
                            accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={async (e) => {
                              const inputEl = e.currentTarget
                              const file = inputEl?.files?.[0]
                              if (!file) return
                              const form = new FormData()
                              form.append('file', file)
                              try {
                                // Add a temporary uploading chip
                                const tempId = `temp-${Date.now()}`
                                setAttachedDocs(prev => [
                                  ...prev,
                                  { id: tempId, name: file.name, url: '', status: 'uploading' }
                                ])
                                const res = await fetch('/api/search/upload', { method: 'POST', body: form })
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}))
                                  throw new Error(err.error || 'Upload failed')
                                }
                                const data = await res.json()
                                // Capture uploaded doc for attachment chip and context
                                if (data?.documentId) {
                                  setAttachedDocs(prev => prev
                                    .filter(d => d.id !== tempId)
                                    .concat({ id: data.documentId, name: data?.metadata?.title || file.name, url: data.fileUrl || '', status: 'ready' }))
                                }
                                toast.success('Document uploaded')
                              } catch (err: any) {
                                // Mark the temp chip as error
                                setAttachedDocs(prev => prev.map(d => d.status === 'uploading' ? { ...d, status: 'error' } : d))
                                toast.error(err.message || 'Failed to upload')
                              } finally {
                                if (inputEl) inputEl.value = ''
                              }
                            }}
                          />
                          Upload
                        </label>

                        {/* Stop generation button - shows when typing */}
                        {isTyping ? (
                          <Button
                            onClick={stopGeneration}
                            variant="outline"
                            size="sm"
                            className="ml-auto h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
                          >
                            <Square className="h-3 w-3 fill-current" />
                            Stop
                          </Button>
                        ) : (
                          <>
                            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                              <button
                                onClick={handleSendMessage}
                                disabled={!currentMessage.trim() || isTyping || loading || !user?.id || attachedDocs.some(d => d.status === 'uploading')}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5"/> Send
                              </button>
                              <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-slate-50 transition-colors">
                                <Mic className="h-3.5 w-3.5"/> Voice
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Quick-phrase buttons removed per request */}
              </div>
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default SearchPage
