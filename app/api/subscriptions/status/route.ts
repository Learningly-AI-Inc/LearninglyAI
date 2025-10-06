import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'
import { createClient } from '@/lib/supabase-server'

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

    // Always ensure there is a subscription record for this user and sync with Stripe
    try {
      await subscriptionService.ensureUserSubscriptionRecord(user.id)
    } catch (e) {
      // Non-fatal; continue to compute free status if needed
      console.log('ensureUserSubscriptionRecord failed:', e)
    }

    // Get user's subscription with plan details
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id)
    
    
    if (!subscription) {
      // Return free plan details (new pricing model)
      const usage = await subscriptionService.getCurrentUsage(user.id)
      const limits = subscriptionService.getPlanLimits('Free')
      
      return NextResponse.json({
        plan: {
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
        },
        status: 'canceled', // Not premium; aligns with free tier
        current_period_end: null,
        usage,
      })
    }

    // Get current usage and plan limits
    const usage = await subscriptionService.getCurrentUsage(user.id)
    const limits = subscriptionService.getPlanLimits(subscription.plan_name)

    return NextResponse.json({
      plan: {
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
      },
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      usage,
    })
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
