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

    const { immediately = false } = await request.json()

    // Check if user has a subscription
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id)
    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Cancel the subscription
    await subscriptionService.cancelSubscription(
      user.id,
      subscription.stripe_subscription_id,
      immediately
    )

    return NextResponse.json({
      success: true,
      message: immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the billing period'
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
