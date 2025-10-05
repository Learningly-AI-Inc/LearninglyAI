import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (from Vercel Cron or similar)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { typescript: true })
    
    console.log('Starting scheduled subscription sync...')
    
    // Get all active subscriptions from Supabase
    const { data: subscriptions, error } = await admin
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          id,
          name,
          price_cents
        )
      `)
      .not('stripe_subscription_id', 'is', null)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
    
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }
    
    console.log(`Found ${subscriptions?.length || 0} subscriptions to verify`)
    
    let updatedCount = 0
    let errorCount = 0
    
    // Verify each subscription with Stripe
    for (const sub of subscriptions || []) {
      try {
        if (!sub.stripe_subscription_id) continue
        
        // Get current status from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
        
        // Check if status has changed
        if (stripeSub.status !== sub.status) {
          console.log(`Updating subscription ${sub.id} status from ${sub.status} to ${stripeSub.status}`)
          
          // Update subscription in Supabase
          await admin
            .from('user_subscriptions')
            .update({
              status: stripeSub.status as any,
              current_period_start: new Date((stripeSub as any).current_period_start * 1000),
              current_period_end: new Date((stripeSub as any).current_period_end * 1000),
              cancel_at_period_end: (stripeSub as any).cancel_at_period_end,
              trial_end: (stripeSub as any).trial_end 
                ? new Date((stripeSub as any).trial_end * 1000) 
                : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id)
          
          updatedCount++
        }
        
      } catch (error) {
        console.error(`Error verifying subscription ${sub.id}:`, error)
        errorCount++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Sync completed. Updated: ${updatedCount}, Errors: ${errorCount}`,
      totalSubscriptions: subscriptions?.length || 0,
      updatedCount,
      errorCount
    })
    
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync subscriptions' },
      { status: 500 }
    )
  }
}
