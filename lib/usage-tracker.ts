import { subscriptionService } from './subscription-service'

export type UsageAction = 'documents_uploaded' | 'ai_requests' | 'search_queries' | 'exam_sessions'

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
    aiRequests: { used: number; limit: number | string; percentage: number }
    searchQueries: { used: number; limit: number | string; percentage: number }
    examSessions: { used: number; limit: number | string; percentage: number }
  }> {
    try {
      const subscription = await subscriptionService.getUserSubscriptionWithPlan(userId)
      const usage = await subscriptionService.getCurrentUsage(userId)
      
      // Default to free plan if no subscription
      const limits = subscription?.subscription_plans?.limits || {
        ai_requests: 10,
        document_uploads: 3,
        search_queries: 50,
        exam_sessions: 5,
      }

      return {
        documents: {
          used: usage.documents_uploaded,
          limit: limits.document_uploads === -1 ? 'Unlimited' : limits.document_uploads,
          percentage: limits.document_uploads === -1 ? 0 : (usage.documents_uploaded / limits.document_uploads) * 100,
        },
        aiRequests: {
          used: usage.ai_requests,
          limit: limits.ai_requests === -1 ? 'Unlimited' : limits.ai_requests,
          percentage: limits.ai_requests === -1 ? 0 : (usage.ai_requests / limits.ai_requests) * 100,
        },
        searchQueries: {
          used: usage.search_queries,
          limit: limits.search_queries === -1 ? 'Unlimited' : limits.search_queries,
          percentage: limits.search_queries === -1 ? 0 : (usage.search_queries / limits.search_queries) * 100,
        },
        examSessions: {
          used: usage.exam_sessions,
          limit: limits.exam_sessions === -1 ? 'Unlimited' : limits.exam_sessions,
          percentage: limits.exam_sessions === -1 ? 0 : (usage.exam_sessions / limits.exam_sessions) * 100,
        },
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return {
        documents: { used: 0, limit: 3, percentage: 0 },
        aiRequests: { used: 0, limit: 10, percentage: 0 },
        searchQueries: { used: 0, limit: 50, percentage: 0 },
        examSessions: { used: 0, limit: 5, percentage: 0 },
      }
    }
  }
}

// Convenience functions for common operations
export const trackDocumentUpload = (userId: string, fileCount: number = 1) =>
  UsageTracker.trackUsage({ userId, action: 'documents_uploaded', amount: fileCount })

export const trackAIRequest = (userId: string) =>
  UsageTracker.trackUsage({ userId, action: 'ai_requests' })

export const trackSearchQuery = (userId: string) =>
  UsageTracker.trackUsage({ userId, action: 'search_queries' })

export const trackExamSession = (userId: string) =>
  UsageTracker.trackUsage({ userId, action: 'exam_sessions' })

export const canUploadDocuments = (userId: string, fileCount: number = 1) =>
  UsageTracker.canPerformAction({ userId, action: 'documents_uploaded', amount: fileCount })

export const canMakeAIRequest = (userId: string) =>
  UsageTracker.canPerformAction({ userId, action: 'ai_requests' })

export const canPerformSearch = (userId: string) =>
  UsageTracker.canPerformAction({ userId, action: 'search_queries' })

export const canCreateExamSession = (userId: string) =>
  UsageTracker.canPerformAction({ userId, action: 'exam_sessions' })
