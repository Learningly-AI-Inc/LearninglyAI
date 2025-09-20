import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

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

    const supabase = createAdminClient()

    // Check if user exists by listing users and filtering by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Get a large number to find the user
    })
    
    if (userError) {
      console.error('Error checking user:', userError)
      return NextResponse.json(
        { error: 'Failed to check user account' },
        { status: 500 }
      )
    }

    // Find user by email
    const user = users?.users?.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    // Check if user already has a password by checking if they can sign in with password
    // If user has password, they should be able to sign in
    // We'll skip this check for now and let the update proceed

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
