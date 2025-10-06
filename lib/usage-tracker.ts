import { subscriptionService } from './subscription-service'

export type UsageAction = 'documents_uploaded' | 'writing_words' | 'search_queries' | 'exam_sessions'

export interface UsageTrackerOptions {
  userId: string
  action: UsageAction
  amount?: number
  showUpgradePrompt?: boolean
}

export class UsageTracker {
  /**
   * Check if user can perform an action without incrementing usage
   */
  static async canPerformAction(options: UsageTrackerOptions): Promise<{
    canProceed: boolean
    needsUpgrade: boolean
    currentUsage: number
    limit: number
  }> {
    const { userId, action, amount = 1 } = options
    
    try {
      const canProceed = await subscriptionService.checkUsageLimit(userId, action, amount)
      const currentUsage = await subscriptionService.getCurrentUsage(userId)
      const subscription = await subscriptionService.getUserSubscriptionWithPlan(userId)
      
      const limit = subscription?.subscription_plans?.limits[action] || 0
      const current = currentUsage[action] || 0
      
      return {
        canProceed,
        needsUpgrade: !canProceed && options.showUpgradePrompt !== false,
        currentUsage: current,
        limit,
      }
    } catch (error) {
      console.error('Error checking usage limit:', error)
      return {
        canProceed: false,
        needsUpgrade: false,
        currentUsage: 0,
        limit: 0,
      }
    }
  }

  /**
   * Track usage after a successful operation
   */
  static async trackUsage(options: UsageTrackerOptions): Promise<boolean> {
    const { userId, action, amount = 1 } = options
    
    try {
      await subscriptionService.incrementUsage(userId, action, amount)
      return true
    } catch (error) {
      console.error('Error tracking usage:', error)
      return false
    }
  }

  /**
   * Execute an operation with usage tracking
   */
  static async executeWithTracking<T>(
    options: UsageTrackerOptions,
    operation: () => Promise<T>
  ): Promise<{
    success: boolean
    result?: T
    error?: string
    needsUpgrade?: boolean
    usageInfo?: {
      currentUsage: number
      limit: number
      percentage: number
    }
  }> {
    const { userId, action, amount = 1, showUpgradePrompt = true } = options

    try {
      // Check usage limit first
      const canPerform = await this.canPerformAction(options)
      
      if (!canPerform.canProceed) {
        return {
          success: false,
          error: 'Usage limit exceeded',
          needsUpgrade: canPerform.needsUpgrade,
          usageInfo: {
            currentUsage: canPerform.currentUsage,
            limit: canPerform.limit,
            percentage: canPerform.limit > 0 ? (canPerform.currentUsage / canPerform.limit) * 100 : 0,
          },
        }
      }

      // Execute the operation
      const result = await operation()

      // Track usage after successful operation
      await this.trackUsage(options)

      return {
        success: true,
        result,
      }
    } catch (error) {
      console.error('Error in executeWithTracking:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get usage statistics for display
   */
  static async getUsageStats(userId: string): Promise<{
    documents: { used: number; limit: number | string; percentage: number }
    writing: { used: number; limit: number | string; percentage: number }
    searchQueries: { used: number; limit: number | string; percentage: number }
    examSessions: { used: number; limit: number | string; percentage: number }
    storage: { used: number; limit: number | string; percentage: number }
  }> {
    try {
      const summary = await subscriptionService.getUsageSummary(userId)
      
      if (!summary) {
        // Default to free plan if no subscription
        return {
          documents: { used: 0, limit: 12, percentage: 0 },
          writing: { used: 0, limit: 5000, percentage: 0 },
          searchQueries: { used: 0, limit: 40, percentage: 0 },
          examSessions: { used: 0, limit: 4, percentage: 0 },
          storage: { used: 0, limit: '250MB', percentage: 0 },
        }
      }

      const { usage, limits, percentages } = summary

      return {
        documents: {
          used: usage.documents_uploaded,
          limit: limits.documents_uploaded === -1 ? 'Unlimited' : limits.documents_uploaded,
          percentage: percentages.documents_uploaded,
        },
        writing: {
          used: usage.writing_words,
          limit: limits.writing_words === -1 ? 'Unlimited' : limits.writing_words.toLocaleString(),
          percentage: percentages.writing_words,
        },
        searchQueries: {
          used: usage.search_queries,
          limit: limits.search_queries === -1 ? 'Unlimited' : limits.search_queries,
          percentage: percentages.search_queries,
        },
        examSessions: {
          used: usage.exam_sessions,
          limit: limits.exam_sessions === -1 ? 'Unlimited' : limits.exam_sessions,
          percentage: percentages.exam_sessions,
        },
        storage: {
          used: usage.storage_used_bytes,
          limit: limits.storage_used_bytes === -1 ? 'Unlimited' : this.formatBytes(limits.storage_used_bytes),
          percentage: percentages.storage_used_bytes,
        },
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return {
        documents: { used: 0, limit: 12, percentage: 0 },
        writing: { used: 0, limit: 5000, percentage: 0 },
        searchQueries: { used: 0, limit: 40, percentage: 0 },
        examSessions: { used: 0, limit: 4, percentage: 0 },
        storage: { used: 0, limit: '250MB', percentage: 0 },
      }
    }
  }

  /**
   * Format bytes to human readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Convenience functions for common operations
export const trackDocumentUpload = (userId: string, fileCount: number = 1) =>
  UsageTracker.trackUsage({ userId, action: 'documents_uploaded', amount: fileCount })

export const trackWritingWords = (userId: string, wordCount: number) =>
  UsageTracker.trackUsage({ userId, action: 'writing_words', amount: wordCount })

export const trackSearchQuery = (userId: string) =>
  UsageTracker.trackUsage({ userId, action: 'search_queries' })

export const trackExamSession = (userId: string) =>
  UsageTracker.trackUsage({ userId, action: 'exam_sessions' })

export const canUploadDocuments = (userId: string, fileCount: number = 1) =>
  UsageTracker.canPerformAction({ userId, action: 'documents_uploaded', amount: fileCount })

export const canWriteWords = (userId: string, wordCount: number = 1) =>
  UsageTracker.canPerformAction({ userId, action: 'writing_words', amount: wordCount })

export const canPerformSearch = (userId: string) =>
  UsageTracker.canPerformAction({ userId, action: 'search_queries' })

export const canCreateExamSession = (userId: string) =>
  UsageTracker.canPerformAction({ userId, action: 'exam_sessions' })
