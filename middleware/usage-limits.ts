import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'

export interface UsageLimitConfig {
  path: string
  action: 'documents_uploaded' | 'writing_words' | 'search_queries' | 'exam_sessions'
  amount?: number
  method?: string
}

// Define usage limits for different API endpoints
const USAGE_LIMITS: UsageLimitConfig[] = [
  // Document uploads
  { path: '/api/reading/upload', action: 'documents_uploaded', amount: 1, method: 'POST' },
  { path: '/api/exam-prep/upload', action: 'documents_uploaded', amount: 1, method: 'POST' },
  { path: '/api/search/upload', action: 'documents_uploaded', amount: 1, method: 'POST' },
  
  // Writing features
  { path: '/api/writing/generate', action: 'writing_words', amount: 500, method: 'POST' }, // Estimate 500 words per generation
  { path: '/api/writing/improve', action: 'writing_words', amount: 300, method: 'POST' }, // Estimate 300 words per improvement
  
  // Search queries
  { path: '/api/search', action: 'search_queries', amount: 1, method: 'POST' },
  { path: '/api/search/enhanced', action: 'search_queries', amount: 1, method: 'POST' },
  
  // Exam sessions
  { path: '/api/exam-prep/generate', action: 'exam_sessions', amount: 1, method: 'POST' },
]

export async function checkUsageLimits(request: NextRequest, userId: string): Promise<{
  allowed: boolean
  limitConfig?: UsageLimitConfig
  error?: string
}> {
  const { pathname } = new URL(request.url)
  const method = request.method
  
  // Find matching usage limit configuration
  const limitConfig = USAGE_LIMITS.find(config => 
    pathname.startsWith(config.path) && 
    (!config.method || config.method === method)
  )
  
  if (!limitConfig) {
    return { allowed: true }
  }
  
  try {
    const canProceed = await subscriptionService.checkUsageLimit(
      userId, 
      limitConfig.action, 
      limitConfig.amount || 1
    )
    
    if (!canProceed) {
      // Get the actual user's plan limits for error message
      const userSubscription = await subscriptionService.getUserSubscription(userId)
      const planName = userSubscription?.plan?.name || 'Free'
      const limits = subscriptionService.getPlanLimits(planName)
      const limitValue = limits[limitConfig.action]
      
      let errorMessage = 'Usage limit exceeded'
      if (limitConfig.action === 'documents_uploaded') {
        errorMessage = `Document upload limit exceeded. ${planName} plan allows ${limitValue} uploads per month.`
      } else if (limitConfig.action === 'writing_words') {
        errorMessage = `Writing word limit exceeded. ${planName} plan allows ${limitValue.toLocaleString()} words per month.`
      } else if (limitConfig.action === 'search_queries') {
        errorMessage = `Search query limit exceeded. ${planName} plan allows ${limitValue} searches per month.`
      } else if (limitConfig.action === 'exam_sessions') {
        errorMessage = `Exam session limit exceeded. ${planName} plan allows ${limitValue} sessions per month.`
      }
      
      return {
        allowed: false,
        limitConfig,
        error: errorMessage
      }
    }
    
    return { allowed: true, limitConfig }
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return {
      allowed: false,
      error: 'Failed to check usage limits'
    }
  }
}

export async function incrementUsageAfterSuccess(
  userId: string, 
  limitConfig: UsageLimitConfig
): Promise<void> {
  try {
    await subscriptionService.incrementUsage(
      userId, 
      limitConfig.action, 
      limitConfig.amount || 1
    )
  } catch (error) {
    console.error('Error incrementing usage:', error)
    // Don't throw here - the operation was successful, just tracking failed
  }
}

// Helper function to extract word count from text
export function estimateWordCount(text: string): number {
  if (!text) return 0
  return text.trim().split(/\s+/).length
}

// Helper function to get usage action from request body for writing features
export function getWritingWordCount(request: NextRequest): Promise<number> {
  return new Promise((resolve) => {
    if (request.method !== 'POST') {
      resolve(0)
      return
    }
    
    request.clone().json().then((body) => {
      const text = body.text || body.content || body.prompt || ''
      resolve(estimateWordCount(text))
    }).catch(() => {
      resolve(500) // Default estimate if we can't parse
    })
  })
}
