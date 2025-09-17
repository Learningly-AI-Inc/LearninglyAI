import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json()
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Check if user already has this provider linked
    const currentProviders = user.app_metadata?.providers || []
    if (currentProviders.includes(provider)) {
      return NextResponse.json({
        success: true,
        message: `${provider} is already linked to your account`
      })
    }
    
    // Link the OAuth provider
    const { data, error } = await supabase.auth.linkIdentity({
      provider: provider as any
    })
    
    if (error) {
      console.error('Error linking OAuth provider:', error)
      return NextResponse.json(
        { error: 'Failed to link OAuth provider', details: error.message },
        { status: 500 }
      )
    }
    
    // Get the updated user after linking
    const { data: { user: updatedUser }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !updatedUser) {
      console.error('Error getting updated user:', userError)
      return NextResponse.json(
        { error: 'Failed to get updated user information' },
        { status: 500 }
      )
    }
    
    // Update the user profile in public.users if needed
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.user_metadata?.full_name || updatedUser.user_metadata?.name || 'User',
        username: `user_${updatedUser.id.substring(0, 8)}`,
        role: 'self-learner',
        last_login: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
    
    if (updateError) {
      console.error('Error updating user profile:', updateError)
    }
    
    return NextResponse.json({
      success: true,
      message: `${provider} successfully linked to your account`,
      user: updatedUser
    })
    
  } catch (error: any) {
    console.error('Unexpected error linking OAuth:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
