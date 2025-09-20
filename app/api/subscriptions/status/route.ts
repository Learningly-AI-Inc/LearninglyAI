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

    // Get user's subscription with plan details
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id)
    
    if (!subscription) {
      // Return free plan details
      return NextResponse.json({
        plan: {
          name: 'Free',
          description: 'Basic features with limited usage',
          price_cents: 0,
          currency: 'USD',
          interval: 'month',
          features: {
            ai_requests: 10,
            document_uploads: 3,
            search_queries: 50,
          },
          limits: {
            storage_mb: 100,
            max_file_size_mb: 10,
          },
        },
        status: 'active',
        current_period_end: null,
        usage: await subscriptionService.getCurrentUsage(user.id),
      })
    }

    // Get current usage
    const usage = await subscriptionService.getCurrentUsage(user.id)

    return NextResponse.json({
      plan: subscription.subscription_plans,
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
