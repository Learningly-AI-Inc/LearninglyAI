import { createClient } from '@/lib/supabase-server'
import { TokenManager } from './token-manager'

export interface ConversationSummary {
  id: string
  conversationId: string
  summary: string
  keyPoints: string[]
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  tokenCount: number
  createdAt: Date
  expiresAt?: Date
}

export interface SummarizationConfig {
  maxSummaryLength: number
  includeKeyPoints: boolean
  includeTopics: boolean
  includeSentiment: boolean
  summaryExpiryHours: number
}

export class ConversationSummarizer {
  private supabase: any
  private config: SummarizationConfig

  constructor(config: Partial<SummarizationConfig> = {}) {
    this.config = {
      maxSummaryLength: 500,
      includeKeyPoints: true,
      includeTopics: true,
      includeSentiment: true,
      summaryExpiryHours: 24,
      ...config
    }
  }

  async initialize() {
    this.supabase = await createClient()
    return Promise.resolve()
  }

  /**
   * Create a comprehensive summary of conversation messages
   */
  async createSummary(
    conversationId: string,
    messages: Array<{ role: string; content: string; timestamp: Date }>,
    model: string = 'gemini-2.5-flash'
  ): Promise<ConversationSummary> {
    if (messages.length === 0) {
      throw new Error('Cannot summarize empty conversation')
    }

    // Check if we already have a recent summary
    const existingSummary = await this.getExistingSummary(conversationId)
    if (existingSummary && this.isSummaryValid(existingSummary)) {
      return existingSummary
    }

    // Prepare conversation text for summarization
    const conversationText = this.prepareConversationText(messages)
    
    // Create different types of summaries
    const summary = await this.generateSummary(conversationText, model)
    const keyPoints = this.config.includeKeyPoints 
      ? await this.extractKeyPoints(conversationText, model)
      : []
    const topics = this.config.includeTopics
      ? await this.extractTopics(conversationText, model)
      : []
    const sentiment = this.config.includeSentiment
      ? await this.analyzeSentiment(conversationText, model)
      : 'neutral'

    const summaryData: ConversationSummary = {
      id: crypto.randomUUID(),
      conversationId,
      summary,
      keyPoints,
      topics,
      sentiment,
      tokenCount: TokenManager.estimateTokens(summary),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.summaryExpiryHours * 60 * 60 * 1000)
    }

    // Store summary in database
    await this.storeSummary(summaryData)

    return summaryData
  }

  /**
   * Create a quick summary for token optimization
   */
  async createQuickSummary(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 100
  ): Promise<string> {
    const conversationText = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    // Use simple text processing for quick summaries
    return this.createSimpleSummary(conversationText, maxTokens)
  }

  /**
   * Get existing summary for conversation
   */
  async getExistingSummary(conversationId: string): Promise<ConversationSummary | null> {
    const { data, error } = await this.supabase
      .from('conversation_summaries')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      summary: data.summary,
      keyPoints: data.key_points || [],
      topics: data.topics || [],
      sentiment: data.sentiment || 'neutral',
      tokenCount: data.token_count,
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
    }
  }

  /**
   * Generate AI-powered summary
   */
  private async generateSummary(conversationText: string, model: string): Promise<string> {
    const prompt = `Please provide a concise summary of the following conversation in ${this.config.maxSummaryLength} characters or less. Focus on the main topics discussed and key decisions or outcomes:

${conversationText}

Summary:`

    try {
      // This would integrate with your AI service
      // For now, return a simple summary
      return this.createSimpleSummary(conversationText, this.config.maxSummaryLength)
    } catch (error) {
      console.error('Error generating AI summary:', error)
      return this.createSimpleSummary(conversationText, this.config.maxSummaryLength)
    }
  }

  /**
   * Extract key points from conversation
   */
  private async extractKeyPoints(conversationText: string, model: string): Promise<string[]> {
    const prompt = `Extract 3-5 key points from this conversation:

${conversationText}

Key points:`

    try {
      // This would integrate with your AI service
      // For now, return simple key points
      return this.createSimpleKeyPoints(conversationText)
    } catch (error) {
      console.error('Error extracting key points:', error)
      return this.createSimpleKeyPoints(conversationText)
    }
  }

  /**
   * Extract topics from conversation
   */
  private async extractTopics(conversationText: string, model: string): Promise<string[]> {
    const prompt = `Identify the main topics discussed in this conversation:

${conversationText}

Topics:`

    try {
      // This would integrate with your AI service
      // For now, return simple topics
      return this.createSimpleTopics(conversationText)
    } catch (error) {
      console.error('Error extracting topics:', error)
      return this.createSimpleTopics(conversationText)
    }
  }

  /**
   * Analyze sentiment of conversation
   */
  private async analyzeSentiment(conversationText: string, model: string): Promise<'positive' | 'neutral' | 'negative'> {
    const prompt = `Analyze the sentiment of this conversation. Respond with only one word: positive, neutral, or negative:

${conversationText}

Sentiment:`

    try {
      // This would integrate with your AI service
      // For now, return neutral
      return 'neutral'
    } catch (error) {
      console.error('Error analyzing sentiment:', error)
      return 'neutral'
    }
  }

  /**
   * Create simple summary using text processing
   */
  private createSimpleSummary(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }

    // Extract first few sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let summary = ''
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length + 1 <= maxLength) {
        summary += (summary ? '. ' : '') + sentence.trim()
      } else {
        break
      }
    }

    return summary + (summary.length < text.length ? '...' : '')
  }

  /**
   * Create simple key points
   */
  private createSimpleKeyPoints(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
    return sentences.slice(0, 5).map(s => s.trim())
  }

  /**
   * Create simple topics
   */
  private createSimpleTopics(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'])
    
    const wordCount = new Map<string, number>()
    words.forEach(word => {
      if (word.length > 3 && !commonWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1)
      }
    })

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }

  /**
   * Prepare conversation text for processing
   */
  private prepareConversationText(messages: Array<{ role: string; content: string; timestamp: Date }>): string {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')
  }

  /**
   * Check if summary is still valid
   */
  private isSummaryValid(summary: ConversationSummary): boolean {
    if (!summary.expiresAt) {
      return true
    }
    return new Date() < summary.expiresAt
  }

  /**
   * Store summary in database
   */
  private async storeSummary(summary: ConversationSummary): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_summaries')
      .insert({
        id: summary.id,
        conversation_id: summary.conversationId,
        summary: summary.summary,
        key_points: summary.keyPoints,
        topics: summary.topics,
        sentiment: summary.sentiment,
        token_count: summary.tokenCount,
        created_at: summary.createdAt.toISOString(),
        expires_at: summary.expiresAt?.toISOString()
      })

    if (error) {
      console.error('Error storing summary:', error)
      throw new Error(`Failed to store summary: ${error.message}`)
    }
  }

  /**
   * Update summarization configuration
   */
  updateConfig(newConfig: Partial<SummarizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): SummarizationConfig {
    return { ...this.config }
  }

  /**
   * Delete expired summaries
   */
  async cleanupExpiredSummaries(): Promise<number> {
    const { data, error } = await this.supabase
      .from('conversation_summaries')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('Error cleaning up expired summaries:', error)
      return 0
    }

    return data?.length || 0
  }
}

// Export singleton instance
export const conversationSummarizer = new ConversationSummarizer()
