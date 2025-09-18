import { createClient } from '@/lib/supabase-server'
import { ConversationMessage } from './conversation-context-manager'

export interface ConversationData {
  id: string
  userId: string
  title: string
  modelUsed: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  totalTokens: number
}

export interface MessageData {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  modelUsed?: string
  tokensUsed?: number
  createdAt: Date
}

export interface ConversationStats {
  totalConversations: number
  totalMessages: number
  totalTokens: number
  averageMessagesPerConversation: number
  averageTokensPerMessage: number
  mostUsedModel: string
  recentActivity: Date[]
}

export class ConversationPersistence {
  private supabase: any

  async initialize() {
    this.supabase = await createClient()
    return Promise.resolve()
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    title: string = 'New Conversation',
    modelUsed: string = 'gemini-2.5-flash'
  ): Promise<ConversationData> {
    const conversationId = crypto.randomUUID()
    const now = new Date()

    const { data, error } = await this.supabase
      .from('search_conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        title,
        model_used: modelUsed,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      modelUsed: data.model_used,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      messageCount: 0,
      totalTokens: 0
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string, userId: string): Promise<ConversationData | null> {
    const { data, error } = await this.supabase
      .from('search_conversations')
      .select(`
        *,
        search_messages(count)
      `)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      modelUsed: data.model_used,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      messageCount: data.search_messages?.[0]?.count || 0,
      totalTokens: 0 // Would need to calculate from messages
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationData[]> {
    const { data, error } = await this.supabase
      .from('search_conversations')
      .select(`
        *,
        search_messages(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`)
    }

    return (data || []).map((conv: any) => ({
      id: conv.id,
      userId: conv.user_id,
      title: conv.title,
      modelUsed: conv.model_used,
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
      messageCount: conv.search_messages?.[0]?.count || 0,
      totalTokens: 0
    }))
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(
    conversationId: string,
    userId: string,
    newTitle: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('search_conversations')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to update conversation title: ${error.message}`)
    }
  }

  /**
   * Delete conversation and all its messages
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('search_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`)
    }
  }

  /**
   * Save message to conversation
   */
  async saveMessage(
    conversationId: string,
    message: ConversationMessage,
    modelUsed?: string
  ): Promise<MessageData> {
    const { data, error } = await this.supabase
      .from('search_messages')
      .insert({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        sources: message.sources,
        model_used: modelUsed,
        tokens_used: message.tokens,
        created_at: message.timestamp.toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`)
    }

    // Update conversation's updated_at timestamp
    await this.updateConversationTimestamp(conversationId)

    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      sources: data.sources,
      modelUsed: data.model_used,
      tokensUsed: data.tokens_used,
      createdAt: new Date(data.created_at)
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<MessageData[]> {
    const { data, error } = await this.supabase
      .from('search_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      modelUsed: msg.model_used,
      tokensUsed: msg.tokens_used,
      createdAt: new Date(msg.created_at)
    }))
  }

  /**
   * Get conversation statistics for a user
   */
  async getUserConversationStats(userId: string): Promise<ConversationStats> {
    // Get conversation count
    const { count: conversationCount, error: convError } = await this.supabase
      .from('search_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (convError) {
      throw new Error(`Failed to get conversation count: ${convError.message}`)
    }

    // Get message count and token usage
    const { data: messageStats, error: msgError } = await this.supabase
      .from('search_messages')
      .select('tokens_used, created_at, model_used')
      .in('conversation_id', 
        this.supabase
          .from('search_conversations')
          .select('id')
          .eq('user_id', userId)
      )

    if (msgError) {
      throw new Error(`Failed to get message stats: ${msgError.message}`)
    }

    const totalMessages = messageStats?.length || 0
    const totalTokens = messageStats?.reduce((sum: number, msg: any) => 
      sum + (msg.tokens_used || 0), 0) || 0

    // Get most used model
    const modelCounts = new Map<string, number>()
    messageStats?.forEach((msg: any) => {
      if (msg.model_used) {
        modelCounts.set(msg.model_used, (modelCounts.get(msg.model_used) || 0) + 1)
      }
    })
    const mostUsedModel = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentActivity = messageStats
      ?.filter((msg: any) => new Date(msg.created_at) > thirtyDaysAgo)
      .map((msg: any) => new Date(msg.created_at)) || []

    return {
      totalConversations: conversationCount || 0,
      totalMessages,
      totalTokens,
      averageMessagesPerConversation: conversationCount ? totalMessages / conversationCount : 0,
      averageTokensPerMessage: totalMessages ? totalTokens / totalMessages : 0,
      mostUsedModel,
      recentActivity
    }
  }

  /**
   * Search conversations by title or content
   */
  async searchConversations(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<ConversationData[]> {
    const { data, error } = await this.supabase
      .from('search_conversations')
      .select(`
        *,
        search_messages(count)
      `)
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,id.in.(${
        this.supabase
          .from('search_messages')
          .select('conversation_id')
          .ilike('content', `%${query}%`)
      })`)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to search conversations: ${error.message}`)
    }

    return (data || []).map((conv: any) => ({
      id: conv.id,
      userId: conv.user_id,
      title: conv.title,
      modelUsed: conv.model_used,
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
      messageCount: conv.search_messages?.[0]?.count || 0,
      totalTokens: 0
    }))
  }

  /**
   * Clean up old conversations (older than specified days)
   */
  async cleanupOldConversations(userId: string, daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    const { data, error } = await this.supabase
      .from('search_conversations')
      .delete()
      .eq('user_id', userId)
      .lt('updated_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      throw new Error(`Failed to cleanup old conversations: ${error.message}`)
    }

    return data?.length || 0
  }

  /**
   * Update conversation timestamp
   */
  private async updateConversationTimestamp(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('search_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (error) {
      console.error('Failed to update conversation timestamp:', error)
    }
  }

  /**
   * Get conversation with message count
   */
  async getConversationWithMessageCount(
    conversationId: string,
    userId: string
  ): Promise<ConversationData & { messages: MessageData[] } | null> {
    const conversation = await this.getConversation(conversationId, userId)
    if (!conversation) {
      return null
    }

    const messages = await this.getConversationMessages(conversationId)
    
    return {
      ...conversation,
      messages
    }
  }

  /**
   * Batch save messages
   */
  async batchSaveMessages(
    conversationId: string,
    messages: ConversationMessage[],
    modelUsed?: string
  ): Promise<MessageData[]> {
    const messageData = messages.map(msg => ({
      id: msg.id,
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      model_used: modelUsed,
      tokens_used: msg.tokens,
      created_at: msg.timestamp.toISOString()
    }))

    const { data, error } = await this.supabase
      .from('search_messages')
      .insert(messageData)
      .select()

    if (error) {
      throw new Error(`Failed to batch save messages: ${error.message}`)
    }

    // Update conversation timestamp
    await this.updateConversationTimestamp(conversationId)

    return (data || []).map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      modelUsed: msg.model_used,
      tokensUsed: msg.tokens_used,
      createdAt: new Date(msg.created_at)
    }))
  }
}

// Export singleton instance
export const conversationPersistence = new ConversationPersistence()
