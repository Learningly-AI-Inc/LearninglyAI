import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'
import { createClient } from '@/lib/supabase-server'

/**
 * Combined endpoint that returns both usage and subscription data in a single call
 * This eliminates the need for multiple API calls and speeds up initial load
 */
export async function GET(request: NextRequest) {
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

    // Always ensure there is a subscription record for this user
    try {
      await subscriptionService.ensureUserSubscriptionRecord(user.id)
    } catch (e) {
      // Non-fatal; continue to compute free status if needed
      console.log('ensureUserSubscriptionRecord failed:', e)
    }

    // Fetch all data in parallel for better performance
    const [subscription, usage] = await Promise.all([
      subscriptionService.getUserSubscriptionWithPlan(user.id),
      subscriptionService.getCurrentUsage(user.id)
    ])

    // Determine plan details
    let planData
    if (subscription && subscription.plan_name !== 'Free' &&
        (subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing')) {
      const limits = subscriptionService.getPlanLimits(subscription.plan_name)
      planData = {
        name: subscription.plan_name,
        description: subscription.plan_name.includes('Premium') ? 'Best for daily activities' : 'Best for trying Learningly',
        price_cents: subscription.plan_price_cents,
        currency: 'USD',
        interval: subscription.plan_name.includes('Yearly') ? 'year' : 'month',
        features: {
          documents_uploaded: limits.documents_uploaded,
          writing_words: limits.writing_words,
          search_queries: limits.search_queries,
          exam_sessions: limits.exam_sessions,
          storage_used_bytes: limits.storage_used_bytes,
        },
        limits: {
          documents_uploaded: limits.documents_uploaded,
          writing_words: limits.writing_words,
          search_queries: limits.search_queries,
          exam_sessions: limits.exam_sessions,
          storage_used_bytes: limits.storage_used_bytes,
        },
      }
    } else {
      // Free plan
      const limits = subscriptionService.getPlanLimits('Free')
      planData = {
        name: 'Free',
        description: 'Best for trying Learningly',
        price_cents: 0,
        currency: 'USD',
        interval: 'month',
        features: {
          documents_uploaded: limits.documents_uploaded,
          writing_words: limits.writing_words,
          search_queries: limits.search_queries,
          exam_sessions: limits.exam_sessions,
          storage_used_bytes: limits.storage_used_bytes,
        },
        limits: {
          documents_uploaded: limits.documents_uploaded,
          writing_words: limits.writing_words,
          search_queries: limits.search_queries,
          exam_sessions: limits.exam_sessions,
          storage_used_bytes: limits.storage_used_bytes,
        },
      }
    }

    return NextResponse.json({
      plan: planData,
      status: subscription?.subscription_status || 'canceled',
      current_period_end: subscription?.current_period_end || null,
      cancel_at_period_end: subscription?.cancel_at_period_end || false,
      usage,
      summary: {
        usage
      }
    })
  } catch (error) {
    console.error('Error fetching user status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user status' },
      { status: 500 }
    )
  }
}
