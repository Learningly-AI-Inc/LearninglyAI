/**
 * Token Management Utilities for AI Conversations
 * Handles token counting, cost estimation, and optimization strategies
 */

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
}

export interface TokenLimits {
  maxTokensPerRequest: number
  maxTokensPerConversation: number
  warningThreshold: number
  costPerToken: number
}

export interface ModelConfig {
  name: string
  maxTokens: number
  costPer1kTokens: {
    prompt: number
    completion: number
  }
  contextWindow: number
}

export class TokenManager {
  private static readonly MODEL_CONFIGS: Record<string, ModelConfig> = {
    'gpt-4': {
      name: 'gpt-4',
      maxTokens: 8192,
      costPer1kTokens: { prompt: 0.03, completion: 0.06 },
      contextWindow: 8192
    },
    'gpt-4-turbo': {
      name: 'gpt-4-turbo',
      maxTokens: 128000,
      costPer1kTokens: { prompt: 0.01, completion: 0.03 },
      contextWindow: 128000
    },
    'gpt-3.5-turbo': {
      name: 'gpt-3.5-turbo',
      maxTokens: 4096,
      costPer1kTokens: { prompt: 0.0015, completion: 0.002 },
      contextWindow: 4096
    },
    'gemini-2.5-flash': {
      name: 'gemini-2.5-flash',
      maxTokens: 8192,
      costPer1kTokens: { prompt: 0.00075, completion: 0.003 },
      contextWindow: 1000000
    },
    'gemini-2.5-pro': {
      name: 'gemini-2.5-pro',
      maxTokens: 8192,
      costPer1kTokens: { prompt: 0.00125, completion: 0.005 },
      contextWindow: 2000000
    }
  }

  private limits: TokenLimits

  constructor(limits: Partial<TokenLimits> = {}) {
    this.limits = {
      maxTokensPerRequest: 4000,
      maxTokensPerConversation: 8000,
      warningThreshold: 0.8, // 80% of limit
      costPerToken: 0.00002, // Default cost per token
      ...limits
    }
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokens(text: string): number {
    if (!text) return 0
    
    // More accurate estimation based on OpenAI's tokenizer behavior
    // English text: ~4 characters per token
    // Code: ~3 characters per token
    // Mixed content: ~3.5 characters per token
    
    const words = text.split(/\s+/).length
    const characters = text.length
    
    // Use the higher of word-based or character-based estimation
    const wordBasedEstimate = Math.ceil(words * 1.3) // ~1.3 tokens per word
    const charBasedEstimate = Math.ceil(characters / 3.5) // ~3.5 chars per token
    
    return Math.max(wordBasedEstimate, charBasedEstimate)
  }

  /**
   * Count tokens for an array of messages
   */
  static countMessageTokens(messages: Array<{ role: string; content: string }>): number {
    return messages.reduce((total, message) => {
      // Add tokens for role and content
      const roleTokens = 2 // "role" + role name
      const contentTokens = this.estimateTokens(message.content)
      const formattingTokens = 4 // Message formatting overhead
      
      return total + roleTokens + contentTokens + formattingTokens
    }, 0)
  }

  /**
   * Calculate cost for token usage
   */
  static calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string = 'gpt-3.5-turbo'
  ): number {
    const config = TokenManager.MODEL_CONFIGS[model]
    if (!config) {
      // Fallback to default pricing
      return (promptTokens + completionTokens) * 0.00002
    }

    const promptCost = (promptTokens / 1000) * config.costPer1kTokens.prompt
    const completionCost = (completionTokens / 1000) * config.costPer1kTokens.completion
    
    return promptCost + completionCost
  }

  /**
   * Check if token usage exceeds limits
   */
  checkTokenLimits(currentTokens: number, model: string): {
    withinLimits: boolean
    warnings: string[]
    recommendations: string[]
  } {
    const config = TokenManager.MODEL_CONFIGS[model]
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check request limit
    if (currentTokens > this.limits.maxTokensPerRequest) {
      warnings.push(`Token count (${currentTokens}) exceeds request limit (${this.limits.maxTokensPerRequest})`)
      recommendations.push('Consider reducing message length or splitting into multiple requests')
    }

    // Check conversation limit
    if (currentTokens > this.limits.maxTokensPerConversation) {
      warnings.push(`Token count (${currentTokens}) exceeds conversation limit (${this.limits.maxTokensPerConversation})`)
      recommendations.push('Consider summarizing older messages or starting a new conversation')
    }

    // Check model-specific limits
    if (config && currentTokens > config.contextWindow) {
      warnings.push(`Token count (${currentTokens}) exceeds model context window (${config.contextWindow})`)
      recommendations.push(`Consider using a model with larger context window or reducing message length`)
    }

    // Check warning threshold
    const requestThreshold = this.limits.maxTokensPerRequest * this.limits.warningThreshold
    if (currentTokens > requestThreshold && currentTokens <= this.limits.maxTokensPerRequest) {
      warnings.push(`Token count (${currentTokens}) is approaching request limit (${this.limits.maxTokensPerRequest})`)
      recommendations.push('Consider optimizing message content')
    }

    return {
      withinLimits: warnings.length === 0,
      warnings,
      recommendations
    }
  }

  /**
   * Optimize messages to fit within token limits
   */
  optimizeMessages(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
    model: string = 'gpt-3.5-turbo'
  ): {
    optimizedMessages: Array<{ role: string; content: string }>
    removedTokens: number
    strategy: string
  } {
    const currentTokens = TokenManager.countMessageTokens(messages)
    
    if (currentTokens <= maxTokens) {
      return {
        optimizedMessages: messages,
        removedTokens: 0,
        strategy: 'no_optimization_needed'
      }
    }

    // Strategy 1: Remove oldest messages (keep system message)
    const systemMessages = messages.filter(m => m.role === 'system')
    const nonSystemMessages = messages.filter(m => m.role !== 'system')
    
    let optimizedMessages = [...systemMessages]
    let removedTokens = 0
    let strategy = 'removed_oldest_messages'

    // Try removing oldest messages first
    for (let i = 0; i < nonSystemMessages.length; i++) {
      const testMessages = [...optimizedMessages, ...nonSystemMessages.slice(i)]
      const testTokens = TokenManager.countMessageTokens(testMessages)
      
      if (testTokens <= maxTokens) {
        optimizedMessages = testMessages
        removedTokens = currentTokens - testTokens
        break
      }
    }

    // Strategy 2: If still too many tokens, truncate message content
    if (TokenManager.countMessageTokens(optimizedMessages) > maxTokens) {
      const maxContentLength = Math.floor(maxTokens * 3.5) // Rough character limit
      
      optimizedMessages = optimizedMessages.map(message => {
        if (message.content.length > maxContentLength) {
          return {
            ...message,
            content: message.content.substring(0, maxContentLength - 3) + '...'
          }
        }
        return message
      })
      
      strategy = 'truncated_content'
      removedTokens = currentTokens - TokenManager.countMessageTokens(optimizedMessages)
    }

    return {
      optimizedMessages,
      removedTokens,
      strategy
    }
  }

  /**
   * Get token usage statistics
   */
  getTokenStats(
    messages: Array<{ role: string; content: string }>,
    model: string = 'gpt-3.5-turbo'
  ): {
    totalTokens: number
    estimatedCost: number
    tokenBreakdown: {
      system: number
      user: number
      assistant: number
    }
    optimization: {
      needed: boolean
      potentialSavings: number
    }
  } {
    const totalTokens = TokenManager.countMessageTokens(messages)
    const estimatedCost = TokenManager.calculateCost(totalTokens, 0, model)
    
    const tokenBreakdown = {
      system: 0,
      user: 0,
      assistant: 0
    }

    messages.forEach(message => {
      const tokens = TokenManager.estimateTokens(message.content)
      if (message.role === 'system') tokenBreakdown.system += tokens
      else if (message.role === 'user') tokenBreakdown.user += tokens
      else if (message.role === 'assistant') tokenBreakdown.assistant += tokens
    })

    const optimization = {
      needed: totalTokens > this.limits.maxTokensPerRequest,
      potentialSavings: totalTokens > this.limits.maxTokensPerRequest 
        ? TokenManager.calculateCost(totalTokens - this.limits.maxTokensPerRequest, 0, model)
        : 0
    }

    return {
      totalTokens,
      estimatedCost,
      tokenBreakdown,
      optimization
    }
  }

  /**
   * Create a summary to reduce token usage
   */
  static createTokenEfficientSummary(
    messages: Array<{ role: string; content: string }>,
    maxSummaryTokens: number = 200
  ): string {
    const conversationText = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const maxSummaryLength = maxSummaryTokens * 3.5 // Convert to characters
    
    if (conversationText.length <= maxSummaryLength) {
      return conversationText
    }

    // Simple truncation with key points extraction
    const sentences = conversationText.split(/[.!?]+/)
    const keySentences = sentences
      .filter(s => s.length > 20) // Filter out very short sentences
      .slice(0, Math.floor(maxSummaryLength / 50)) // Rough sentence limit
    
    return keySentences.join('. ') + (keySentences.length < sentences.length ? '...' : '')
  }

  /**
   * Get model configuration
   */
  static getModelConfig(model: string): ModelConfig | null {
    return TokenManager.MODEL_CONFIGS[model] || null
  }

  /**
   * List available models
   */
  static getAvailableModels(): string[] {
    return Object.keys(TokenManager.MODEL_CONFIGS)
  }

  /**
   * Update token limits
   */
  updateLimits(newLimits: Partial<TokenLimits>): void {
    this.limits = { ...this.limits, ...newLimits }
  }

  /**
   * Get current limits
   */
  getLimits(): TokenLimits {
    return { ...this.limits }
  }
}

// Export singleton instance with default limits
export const tokenManager = new TokenManager({
  maxTokensPerRequest: 4000,
  maxTokensPerConversation: 8000,
  warningThreshold: 0.8,
  costPerToken: 0.00002
})
