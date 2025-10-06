import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Check if user already exists in public.user_data table
    const { data: existingUser, error: checkError } = await supabase
      .from('user_data')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      )
    }
    
    // If user already exists, return success
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User profile already exists',
        user: existingUser
      })
    }
    
    // Create user profile in public.user_data table
    const { data: newUser, error: createError } = await supabase
      .from('user_data')
      .insert({
        user_id: user.id,
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating user profile:', createError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'User profile created successfully',
      user: newUser
    })
    
  } catch (error: any) {
    console.error('Unexpected error creating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
