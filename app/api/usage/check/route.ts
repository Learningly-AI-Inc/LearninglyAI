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

    // Get current usage and subscription
    const currentUsage = await subscriptionService.getCurrentUsage(targetUserId)
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(targetUserId)

    // Get plan name - default to 'Free' if no subscription
    const planName = subscription?.subscription_plans?.name || 'Free'

    // Get limits using the service method
    const limits = subscriptionService.getPlanLimits(planName)
    const limit = limits[action] || 0
    const current = (currentUsage as any)[action] || 0

    // Check if user can proceed
    // -1 means unlimited
    let canProceed = false
    if (limit === -1) {
      canProceed = true
    } else if (limit === 0) {
      canProceed = false
    } else {
      canProceed = (current + amount) <= limit
    }

    const percentage = limit > 0 ? (current / limit) * 100 : (limit === -1 ? 0 : 100)

    // Determine if user needs upgrade
    const needsUpgrade = !canProceed && planName.toLowerCase().includes('free')
    
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
