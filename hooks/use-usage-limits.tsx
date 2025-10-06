'use client'

import { useSubscription } from './use-subscription'

export interface UsageLimitConfig {
  action: 'documents_uploaded' | 'writing_words' | 'search_queries' | 'exam_sessions'
  amount?: number
  showUpgradePrompt?: boolean
}

export function useUsageLimits() {
  const { subscription, checkUsageLimit, incrementUsage, canUseFeature, getUsagePercentage } = useSubscription()

  const withUsageCheck = async <T,>(
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

  const checkWritingWords = (wordCount: number = 1): boolean => {
    return canUseFeature('writing_words', wordCount)
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

  const getWritingWordsPercentage = (): number => {
    return getUsagePercentage('writing_words')
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
      writingWords: { used: 0, limit: 5000, percentage: 0 },
      searchQueries: { used: 0, limit: 40, percentage: 0 },
      examSessions: { used: 0, limit: 4, percentage: 0 },
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
      writingWords: {
        used: usage.writing_words,
        limit: plan.limits.writing_words === -1 ? 'Unlimited' : plan.limits.writing_words,
        percentage: getWritingWordsPercentage(),
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

  const isLimitReached = (feature: string): boolean => {
    const percentage = getUsagePercentage(feature as any)
    return percentage >= 100
  }

  const isNearLimit = (feature: string, threshold: number = 80): boolean => {
    const percentage = getUsagePercentage(feature as any)
    return percentage >= threshold
  }

  return {
    subscription,
    withUsageCheck,
    checkDocumentUpload,
    checkWritingWords,
    checkSearchQuery,
    checkExamSession,
    getDocumentUploadPercentage,
    getWritingWordsPercentage,
    getSearchQueryPercentage,
    getExamSessionPercentage,
    getUsageStats,
    isLimitReached,
    isNearLimit,
  }
}
