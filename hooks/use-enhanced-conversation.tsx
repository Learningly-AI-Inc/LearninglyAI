import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/auth/auth-provider'
import { toast } from 'sonner'

export interface EnhancedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number
  sources?: string[]
  isTyping?: boolean
}

export interface ConversationStats {
  totalTokens: number
  estimatedCost: number
  messageCount: number
  averageTokensPerMessage: number
}

export interface EnhancedConversation {
  id: string
  title: string
  modelUsed: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  stats?: ConversationStats
}

export interface UseEnhancedConversationOptions {
  apiEndpoint?: string
  enableTokenTracking?: boolean
  enableCostEstimation?: boolean
  maxRetries?: number
  retryDelay?: number
}

export function useEnhancedConversation(options: UseEnhancedConversationOptions = {}) {
  const {
    apiEndpoint = '/api/search/enhanced',
    enableTokenTracking = true,
    enableCostEstimation = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options

  const { user, loading } = useAuthContext()
  const [messages, setMessages] = useState<EnhancedMessage[]>([])
  const [conversations, setConversations] = useState<EnhancedConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ConversationStats | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)

  // Load conversations on mount
  useEffect(() => {
    if (user && !loading) {
      loadConversations()
    }
  }, [user, loading])

  // Load conversation messages when selected
  useEffect(() => {
    if (selectedConversationId && user) {
      loadConversationMessages(selectedConversationId)
    }
  }, [selectedConversationId, user])

  /**
   * Load all conversations for the user
   */
  const loadConversations = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`${apiEndpoint}?userId=${user.id}`)
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.statusText}`)
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setStats(data.stats || null)
    } catch (err: any) {
      console.error('Error loading conversations:', err)
      setError(err.message)
      toast.error('Failed to load conversations')
    }
  }, [user, apiEndpoint])

  /**
   * Load messages for a specific conversation
   */
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${apiEndpoint}?userId=${user.id}&conversationId=${conversationId}`)
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }

      const data = await response.json()
      const conversationMessages = data.conversation?.messages || []
      
      setMessages(conversationMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        tokens: msg.tokens,
        sources: msg.sources
      })))
    } catch (err: any) {
      console.error('Error loading conversation messages:', err)
      setError(err.message)
      toast.error('Failed to load conversation')
    }
  }, [user, apiEndpoint])

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(async (
    content: string,
    model: string = 'gemini-2.5-flash'
  ): Promise<void> => {
    if (!user || !content.trim()) return

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setIsTyping(true)
    setError(null)
    retryCountRef.current = 0

    // Add user message immediately
    const userMessage: EnhancedMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    // Add typing indicator
    const typingMessage: EnhancedMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }

    setMessages(prev => [...prev, typingMessage])

    try {
      const response = await fetchWithRetry(
        apiEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content.trim(),
            conversationId: selectedConversationId,
            model
          }),
          signal: abortControllerRef.current.signal
        },
        maxRetries,
        retryDelay
      )

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`)
      }

      const data = await response.json()

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'))

      // Add AI response
      const aiMessage: EnhancedMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sources: data.sources,
        tokens: data.tokenUsage?.totalTokens
      }

      setMessages(prev => [...prev, aiMessage])

      // Update conversation ID if this was a new conversation
      if (!selectedConversationId && data.conversationId) {
        setSelectedConversationId(data.conversationId)
      }

      // Reload conversations to get updated list
      await loadConversations()

      // Show cost information if enabled
      if (enableCostEstimation && data.tokenUsage?.estimatedCost) {
        toast.success(`Response generated (Cost: ~$${data.tokenUsage.estimatedCost.toFixed(4)})`)
      }

    } catch (err: any) {
      console.error('Error sending message:', err)
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'))

      if (err.name === 'AbortError') {
        setError('Request was cancelled')
        toast.error('Request was cancelled')
      } else {
        setError(err.message)
        toast.error(`Failed to send message: ${err.message}`)
      }
    } finally {
      setIsLoading(false)
      setIsTyping(false)
      abortControllerRef.current = null
    }
  }, [user, selectedConversationId, apiEndpoint, maxRetries, retryDelay, enableCostEstimation, loadConversations])

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(() => {
    setSelectedConversationId(null)
    setMessages([])
    setError(null)
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Select an existing conversation
   */
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    setError(null)
  }, [])

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${apiEndpoint}?conversationId=${conversationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`)
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // If this was the selected conversation, clear it
      if (selectedConversationId === conversationId) {
        startNewConversation()
      }

      toast.success('Conversation deleted successfully')
    } catch (err: any) {
      console.error('Error deleting conversation:', err)
      setError(err.message)
      toast.error('Failed to delete conversation')
    }
  }, [user, selectedConversationId, apiEndpoint, startNewConversation])

  /**
   * Cancel ongoing request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setIsTyping(false)
      setError('Request cancelled')
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Fetch with retry logic
   */
  const fetchWithRetry = useCallback(async (
    url: string,
    options: RequestInit,
    maxRetries: number,
    retryDelay: number
  ): Promise<Response> => {
    try {
      const response = await fetch(url, options)
      
      if (!response.ok && response.status >= 500 && retryCountRef.current < maxRetries) {
        retryCountRef.current++
        console.log(`Retrying request (${retryCountRef.current}/${maxRetries})...`)
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCountRef.current))
        return fetchWithRetry(url, options, maxRetries, retryDelay)
      }
      
      return response
    } catch (error) {
      if (retryCountRef.current < maxRetries && (error as any).name !== 'AbortError') {
        retryCountRef.current++
        console.log(`Retrying request (${retryCountRef.current}/${maxRetries})...`)
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCountRef.current))
        return fetchWithRetry(url, options, maxRetries, retryDelay)
      }
      
      throw error
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // State
    messages,
    conversations,
    selectedConversationId,
    isLoading,
    isTyping,
    error,
    stats,
    
    // Actions
    sendMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
    cancelRequest,
    clearError,
    loadConversations,
    loadConversationMessages,
    
    // Computed
    hasMessages: messages.length > 0,
    hasConversations: conversations.length > 0,
    currentConversation: conversations.find(conv => conv.id === selectedConversationId),
    totalTokens: messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0)
  }
}
