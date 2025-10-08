import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, action, amount = 1 } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['documents_uploaded', 'writing_words', 'search_queries', 'exam_sessions', 'storage_used_bytes']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: ' + validActions.join(', ') },
        { status: 400 }
      )
    }

    // Use provided userId or fall back to authenticated user
    const targetUserId = userId || user.id

    // Check usage limit
    const canProceed = await subscriptionService.checkUsageLimit(targetUserId, action, amount)
    
    // Get current usage and limits
    const currentUsage = await subscriptionService.getCurrentUsage(targetUserId)
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(targetUserId)
    
    const limit = subscription?.subscription_plans?.limits[action] || 0
    const current = (currentUsage as any)[action] || 0
    const percentage = limit > 0 ? (current / limit) * 100 : 0
    
    // Determine if user needs upgrade
    const needsUpgrade = !canProceed && subscription?.subscription_plans?.name?.toLowerCase().includes('free')
    
    // Generate appropriate message
    let message = ''
    if (!canProceed) {
      if (needsUpgrade) {
        message = `You've reached your free plan limit for ${action.replace('_', ' ')}. Upgrade to continue.`
      } else {
        message = `Usage limit exceeded for ${action.replace('_', ' ')}.`
      }
    }

    return NextResponse.json({
      canProceed,
      needsUpgrade,
      currentUsage: current,
      limit,
      percentage: Math.round(percentage),
      message
    })
  } catch (error) {
    console.error('Error checking usage limit:', error)
    return NextResponse.json(
      { error: 'Failed to check usage limit' },
      { status: 500 }
    )
  }
}
