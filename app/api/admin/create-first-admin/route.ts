import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, username } = await request.json()

    if (!email || !full_name || !username) {
      return NextResponse.json(
        { error: 'Email, full_name, and username are required' },
        { status: 400 }
      )
    }

    const supabase = createApiClient()

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (checkError) {
      console.error('Error checking existing admins:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing admins' },
        { status: 500 }
      )
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { error: 'Admin user already exists' },
        { status: 400 }
      )
    }

    // Create the first admin user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        full_name,
        username,
        role: 'admin',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating admin user:', error)
      return NextResponse.json(
        { error: 'Failed to create admin user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'First admin user created successfully',
      user: data
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
