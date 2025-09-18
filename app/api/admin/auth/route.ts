import { NextRequest, NextResponse } from 'next/server'

// Admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@learningly.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'learningly'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check credentials against environment variables
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user: {
          email: ADMIN_EMAIL,
          role: 'admin'
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Admin authentication endpoint',
    method: 'POST',
    required_fields: ['email', 'password']
  })
}
