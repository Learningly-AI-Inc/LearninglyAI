import { createClient } from '@/lib/supabase-server'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tokens?: number
  sources?: string[]
}

export interface ConversationContext {
  conversationId: string
  messages: ConversationMessage[]
  totalTokens: number
  summary?: string
  lastUpdated: Date
}

export interface ContextConfig {
  maxMessages: number
  maxTokens: number
  summaryThreshold: number
  includeSystemMessage: boolean
}

export class ConversationContextManager {
  private supabase: any
  private config: ContextConfig
  private contextCache: Map<string, ConversationContext> = new Map()

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = {
      maxMessages: 20, // Keep last 20 messages
      maxTokens: 4000, // Max tokens per request
      summaryThreshold: 3000, // Summarize when approaching limit
      includeSystemMessage: true,
      ...config
    }
  }

  async initialize() {
    this.supabase = await createClient()
    return Promise.resolve()
  }

  /**
   * Get conversation context with smart token management
   */
  async getConversationContext(
    conversationId: string,
    userId: string,
    includeRecentMessages: boolean = true
  ): Promise<ConversationContext> {
    // Check cache first
    const cached = this.contextCache.get(conversationId)
    if (cached && this.isCacheValid(cached)) {
      return cached
    }

    // Load from database
    const context = await this.loadConversationFromDB(conversationId, userId)
    
    // Cache the context
    this.contextCache.set(conversationId, context)
    
    return context
  }

  /**
   * Add a new message to conversation context
   */
  async addMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    tokens?: number,
    sources?: string[]
  ): Promise<ConversationContext> {
    const context = await this.getConversationContext(conversationId, userId)
    
    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      tokens,
      sources
    }

    // Add message to context
    context.messages.push(newMessage)
    context.totalTokens += tokens || this.estimateTokens(content)
    context.lastUpdated = new Date()

    // Apply token management
    await this.applyTokenManagement(context)

    // Update cache
    this.contextCache.set(conversationId, context)

    // Persist to database
    await this.persistMessageToDB(conversationId, userId, newMessage)

    return context
  }

  /**
   * Get messages formatted for AI model consumption
   */
  async getFormattedMessages(
    conversationId: string,
    userId: string,
    systemPrompt?: string
  ): Promise<Array<{ role: string; content: string }>> {
    const context = await this.getConversationContext(conversationId, userId)
    const messages: Array<{ role: string; content: string }> = []

    // Add system message if configured
    if (this.config.includeSystemMessage && systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    // Add summary if available
    if (context.summary) {
      messages.push({
        role: 'system',
        content: `Previous conversation summary: ${context.summary}`
      })
    }

    // Add recent messages
    const recentMessages = context.messages.slice(-this.config.maxMessages)
    for (const message of recentMessages) {
      messages.push({
        role: message.role,
        content: message.content
      })
    }

    return messages
  }

  /**
   * Apply token management strategies
   */
  private async applyTokenManagement(context: ConversationContext): Promise<void> {
    if (context.totalTokens <= this.config.maxTokens) {
      return
    }

    // Strategy 1: Remove oldest messages if we have too many
    if (context.messages.length > this.config.maxMessages) {
      const messagesToRemove = context.messages.length - this.config.maxMessages
      const removedMessages = context.messages.splice(0, messagesToRemove)
      
      // Update token count
      const removedTokens = removedMessages.reduce((sum, msg) => 
        sum + (msg.tokens || this.estimateTokens(msg.content)), 0
      )
      context.totalTokens -= removedTokens
    }

    // Strategy 2: Summarize if still over threshold
    if (context.totalTokens > this.config.summaryThreshold) {
      await this.summarizeOldMessages(context)
    }
  }

  /**
   * Summarize old messages to reduce token usage
   */
  private async summarizeOldMessages(context: ConversationContext): Promise<void> {
    const messagesToSummarize = context.messages.slice(0, -10) // Keep last 10 messages
    if (messagesToSummarize.length === 0) return

    // Create summary of old messages
    const summaryText = messagesToSummarize
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')

    // Use AI to create a concise summary
    const summary = await this.createSummary(summaryText)
    
    // Update context
    context.summary = summary
    context.messages = context.messages.slice(-10) // Keep only recent messages
    
    // Recalculate tokens
    context.totalTokens = context.messages.reduce((sum, msg) => 
      sum + (msg.tokens || this.estimateTokens(msg.content)), 0
    )
    context.totalTokens += this.estimateTokens(summary)
  }

  /**
   * Load conversation from database
   */
  private async loadConversationFromDB(
    conversationId: string,
    userId: string
  ): Promise<ConversationContext> {
    const { data: messages, error } = await this.supabase
      .from('search_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to load conversation: ${error.message}`)
    }

    const conversationMessages: ConversationMessage[] = (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      tokens: msg.tokens_used,
      sources: msg.sources
    }))

    const totalTokens = conversationMessages.reduce((sum, msg) => 
      sum + (msg.tokens || this.estimateTokens(msg.content)), 0
    )

    return {
      conversationId,
      messages: conversationMessages,
      totalTokens,
      lastUpdated: new Date()
    }
  }

  /**
   * Persist message to database
   */
  private async persistMessageToDB(
    conversationId: string,
    userId: string,
    message: ConversationMessage
  ): Promise<void> {
    const { error } = await this.supabase
      .from('search_messages')
      .insert({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        tokens_used: message.tokens,
        sources: message.sources,
        created_at: message.timestamp.toISOString()
      })

    if (error) {
      console.error('Failed to persist message:', error)
      throw new Error(`Failed to persist message: ${error.message}`)
    }
  }

  /**
   * Create AI-powered summary
   */
  private async createSummary(text: string): Promise<string> {
    // This would integrate with your AI service
    // For now, return a simple truncation
    return text.length > 500 ? text.substring(0, 500) + '...' : text
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4)
  }

  /**
   * Check if cached context is still valid
   */
  private isCacheValid(context: ConversationContext): boolean {
    const now = new Date()
    const cacheAge = now.getTime() - context.lastUpdated.getTime()
    return cacheAge < 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Clear context cache
   */
  clearCache(conversationId?: string): void {
    if (conversationId) {
      this.contextCache.delete(conversationId)
    } else {
      this.contextCache.clear()
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationId: string): Promise<{
    messageCount: number
    totalTokens: number
    averageTokensPerMessage: number
    oldestMessage: Date | null
    newestMessage: Date | null
  }> {
    const context = await this.getConversationContext(conversationId, '')
    
    const messageCount = context.messages.length
    const totalTokens = context.totalTokens
    const averageTokensPerMessage = messageCount > 0 ? totalTokens / messageCount : 0
    
    const timestamps = context.messages.map(m => m.timestamp)
    const oldestMessage = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null
    const newestMessage = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null

    return {
      messageCount,
      totalTokens,
      averageTokensPerMessage,
      oldestMessage,
      newestMessage
    }
  }
}

// Export singleton instance
export const conversationContextManager = new ConversationContextManager()
