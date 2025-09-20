'use client'

import { useSubscription } from './use-subscription'

export interface UsageLimitConfig {
  action: 'documents_uploaded' | 'ai_requests' | 'search_queries' | 'exam_sessions'
  amount?: number
  showUpgradePrompt?: boolean
}

export function useUsageLimits() {
  const { subscription, checkUsageLimit, incrementUsage, canUseFeature, getUsagePercentage } = useSubscription()

  const withUsageCheck = async <T>(
    config: UsageLimitConfig,
    operation: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: string; needsUpgrade?: boolean }> => {
    const { action, amount = 1, showUpgradePrompt = true } = config

    try {
      // Check if user can perform the action
      const canProceed = await checkUsageLimit(action, amount)
      
      if (!canProceed) {
        if (showUpgradePrompt) {
          return {
            success: false,
            error: 'Usage limit exceeded. Please upgrade your plan to continue.',
            needsUpgrade: true,
          }
        }
        return {
          success: false,
          error: 'Usage limit exceeded.',
        }
      }

      // Perform the operation
      const result = await operation()

      // Increment usage after successful operation
      await incrementUsage(action, amount)

      return {
        success: true,
        result,
      }
    } catch (error) {
      console.error('Error in withUsageCheck:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  const checkDocumentUpload = (fileCount: number = 1): boolean => {
    return canUseFeature('document_uploads', fileCount)
  }

  const checkAIRequest = (requestCount: number = 1): boolean => {
    return canUseFeature('ai_requests', requestCount)
  }

  const checkSearchQuery = (queryCount: number = 1): boolean => {
    return canUseFeature('search_queries', queryCount)
  }

  const checkExamSession = (sessionCount: number = 1): boolean => {
    return canUseFeature('exam_sessions', sessionCount)
  }

  const getDocumentUploadPercentage = (): number => {
    return getUsagePercentage('document_uploads')
  }

  const getAIRequestPercentage = (): number => {
    return getUsagePercentage('ai_requests')
  }

  const getSearchQueryPercentage = (): number => {
    return getUsagePercentage('search_queries')
  }

  const getExamSessionPercentage = (): number => {
    return getUsagePercentage('exam_sessions')
  }

  const getUsageStats = () => {
    if (!subscription) {
      return {
        documents: { used: 0, limit: 3, percentage: 0 },
        aiRequests: { used: 0, limit: 10, percentage: 0 },
        searchQueries: { used: 0, limit: 50, percentage: 0 },
        examSessions: { used: 0, limit: 5, percentage: 0 },
      }
    }

    const plan = subscription.plan
    const usage = subscription.usage

    return {
      documents: {
        used: usage.documents_uploaded,
        limit: plan.limits.document_uploads === -1 ? 'Unlimited' : plan.limits.document_uploads,
        percentage: getDocumentUploadPercentage(),
      },
      aiRequests: {
        used: usage.ai_requests,
        limit: plan.limits.ai_requests === -1 ? 'Unlimited' : plan.limits.ai_requests,
        percentage: getAIRequestPercentage(),
      },
      searchQueries: {
        used: usage.search_queries,
        limit: plan.limits.search_queries === -1 ? 'Unlimited' : plan.limits.search_queries,
        percentage: getSearchQueryPercentage(),
      },
      examSessions: {
        used: usage.exam_sessions,
        limit: plan.limits.exam_sessions === -1 ? 'Unlimited' : plan.limits.exam_sessions,
        percentage: getExamSessionPercentage(),
      },
    }
  }

  const isLimitReached = (feature: keyof UsageLimitConfig['action']): boolean => {
    const percentage = getUsagePercentage(feature)
    return percentage >= 100
  }

  const isNearLimit = (feature: keyof UsageLimitConfig['action'], threshold: number = 80): boolean => {
    const percentage = getUsagePercentage(feature)
    return percentage >= threshold
  }

  return {
    subscription,
    withUsageCheck,
    checkDocumentUpload,
    checkAIRequest,
    checkSearchQuery,
    checkExamSession,
    getDocumentUploadPercentage,
    getAIRequestPercentage,
    getSearchQueryPercentage,
    getExamSessionPercentage,
    getUsageStats,
    isLimitReached,
    isNearLimit,
  }
}
