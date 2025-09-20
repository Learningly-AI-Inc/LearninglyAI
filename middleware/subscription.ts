import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Middleware to track usage and enforce subscription limits
export async function subscriptionMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for certain paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/pricing') ||
    pathname === '/' ||
    pathname === '/landing'
  ) {
    return NextResponse.next()
  }

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.next()
    }

    // Track usage based on the route
    const usageActions = getUsageActionsFromPath(pathname)
    
    if (usageActions.length > 0) {
      // Check usage limits before allowing the request
      for (const action of usageActions) {
        const canProceed = await checkUsageLimit(user.id, action)
        if (!canProceed) {
          // Redirect to upgrade page with usage limit message
          const url = new URL('/pricing', request.url)
          url.searchParams.set('limit_reached', action)
          return NextResponse.redirect(url)
        }
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Subscription middleware error:', error)
    return NextResponse.next()
  }
}

function getUsageActionsFromPath(pathname: string): string[] {
  const actions: string[] = []

  if (pathname.startsWith('/reading') || pathname.startsWith('/exam-prep')) {
    actions.push('documents_uploaded')
  }

  if (pathname.startsWith('/search')) {
    actions.push('search_queries')
  }

  if (pathname.startsWith('/exam-prep')) {
    actions.push('exam_sessions')
  }

  // AI requests are tracked at the API level, not here

  return actions
}

async function checkUsageLimit(userId: string, action: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/usage/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.canProceed
  } catch (error) {
    console.error('Error checking usage limit:', error)
    return false
  }
}
