import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, amount = 1 } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['documents_uploaded', 'ai_requests', 'search_queries', 'exam_sessions']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: ' + validActions.join(', ') },
        { status: 400 }
      )
    }

    // Increment usage
    await subscriptionService.incrementUsage(user.id, action, amount)

    // Get updated usage
    const currentUsage = await subscriptionService.getCurrentUsage(user.id)

    return NextResponse.json({
      success: true,
      usage: currentUsage,
    })
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    )
  }
}
