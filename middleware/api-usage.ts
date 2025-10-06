import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkUsageLimits, incrementUsageAfterSuccess, getWritingWordCount } from './usage-limits'

// API routes that need usage limit checking
const USAGE_TRACKED_ROUTES = [
  '/api/reading/upload',
  '/api/exam-prep/upload', 
  '/api/search/upload',
  '/api/writing/generate',
  '/api/writing/improve',
  '/api/search',
  '/api/search/enhanced',
  '/api/exam-prep/generate'
]

export async function apiUsageMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, method } = new URL(request.url)
  
  // Check if this route needs usage tracking
  const needsTracking = USAGE_TRACKED_ROUTES.some(route => pathname.startsWith(route))
  
  if (!needsTracking || method !== 'POST') {
    return null // Continue with normal flow
  }
  
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check usage limits before processing
    const limitCheck = await checkUsageLimits(request, user.id)
    
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: limitCheck.error || 'Usage limit exceeded',
          needsUpgrade: true,
          limitType: limitCheck.limitConfig?.action
        },
        { status: 429 } // Too Many Requests
      )
    }
    
    // If we have a limit config, we'll need to track usage after success
    // This will be handled by the individual API routes
    return null // Continue with normal flow
    
  } catch (error) {
    console.error('API usage middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function for API routes to track usage after successful operation
export async function trackApiUsage(
  request: NextRequest,
  userId: string,
  customAmount?: number
): Promise<void> {
  const { pathname } = new URL(request.url)
  
  try {
    // Find the matching usage limit configuration
    const limitConfigs = [
      { path: '/api/reading/upload', action: 'documents_uploaded' as const, amount: 1 },
      { path: '/api/exam-prep/upload', action: 'documents_uploaded' as const, amount: 1 },
      { path: '/api/search/upload', action: 'documents_uploaded' as const, amount: 1 },
      { path: '/api/writing/generate', action: 'writing_words' as const, amount: customAmount || 500 },
      { path: '/api/writing/improve', action: 'writing_words' as const, amount: customAmount || 300 },
      { path: '/api/search', action: 'search_queries' as const, amount: 1 },
      { path: '/api/search/enhanced', action: 'search_queries' as const, amount: 1 },
      { path: '/api/exam-prep/generate', action: 'exam_sessions' as const, amount: 1 },
    ]
    
    const config = limitConfigs.find(c => pathname.startsWith(c.path))
    
    if (config) {
      await incrementUsageAfterSuccess(userId, config)
    }
  } catch (error) {
    console.error('Error tracking API usage:', error)
    // Don't throw - this shouldn't fail the main operation
  }
}
