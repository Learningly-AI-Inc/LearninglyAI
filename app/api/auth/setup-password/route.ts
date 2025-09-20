import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user exists
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
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    const user = existingUser.user

    // Check if user already has a password
    if (user.encrypted_password !== null) {
      return NextResponse.json(
        { error: 'Password already set for this account' },
        { status: 400 }
      )
    }

    // Update user with password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password
    })

    if (updateError) {
      console.error('Error setting password:', updateError)
      return NextResponse.json(
        { error: 'Failed to set password' },
        { status: 500 }
      )
    }

    // Update user metadata to indicate password setup completed
    const { error: metadataError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        password_setup_completed: true,
        password_setup_date: new Date().toISOString()
      }
    })

    if (metadataError) {
      console.error('Error updating metadata:', metadataError)
      // Don't fail the request for metadata error
    }

    console.log('Password setup completed for user:', user.id)

    return NextResponse.json({
      success: true,
      message: 'Password set successfully'
    })

  } catch (error) {
    console.error('Error in password setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
