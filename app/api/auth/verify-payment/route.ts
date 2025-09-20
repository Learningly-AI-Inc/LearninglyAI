import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user exists with this email
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userError) {
      console.error('Error checking user:', userError)
      return NextResponse.json(
        { error: 'Failed to check user account' },
        { status: 500 }
      )
    }

    if (!existingUser?.user) {
      return NextResponse.json(
        { 
          error: 'No account found with this email',
          suggestion: 'Please sign up first or check your email address'
        },
        { status: 404 }
      )
    }

    const user = existingUser.user

    // Check if user has a subscription (indicates they paid)
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { 
          error: 'No subscription found for this account',
          suggestion: 'Please sign up for a subscription first'
        },
        { status: 404 }
      )
    }

    // Check if user has a password set
    const hasPassword = user.encrypted_password !== null

    if (hasPassword) {
      // User already has a password, they can sign in normally
      return NextResponse.json({
        hasAccount: true,
        hasPassword: true,
        hasSubscription: true,
        message: 'Account found with password. Please sign in normally.',
        redirectTo: '/account'
      })
    } else {
      // User has account and subscription but no password (payment-only account)
      return NextResponse.json({
        hasAccount: true,
        hasPassword: false,
        hasSubscription: true,
        message: 'Account found with active subscription. Please set up your password.',
        redirectTo: '/account/setup-password',
        userId: user.id
      })
    }

  } catch (error) {
    console.error('Error in payment verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
