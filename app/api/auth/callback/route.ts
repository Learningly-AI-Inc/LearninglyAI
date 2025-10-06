import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Type definitions for better type safety
interface OAuthCallbackParams {
  code?: string | null
  state?: string | null
  error?: string | null
  error_description?: string | null
  next?: string | null
}

interface CallbackError {
  type: 'auth_callback_error' | 'invalid_code' | 'session_error' | 'redirect_error'
  message: string
  details?: string
}

/**
 * Validates and sanitizes the redirect path to prevent open redirect vulnerabilities
 * Supports deep-link returns with query parameters and hash fragments
 */
function validateRedirectPath(path: string | null): string {
  if (!path) return '/dashboard'
  
  // Ensure the path is relative and starts with /
  if (!path.startsWith('/')) {
    return '/dashboard'
  }
  
  // Prevent redirects to external domains
  if (path.includes('://') || path.includes('//')) {
    return '/dashboard'
  }
  
  // Allow common safe paths
  const safePaths = ['/dashboard', '/settings', '/profile']
  if (safePaths.includes(path)) {
    return path
  }
  
  // For other paths, ensure they're relative and don't contain suspicious characters
  // Allow query parameters (?param=value) and hash fragments (#section)
  if (path.match(/^\/[a-zA-Z0-9\/\-_]+(\?[^#]*)?(#.*)?$/)) {
    return path
  }
  
  return '/dashboard'
}

/**
 * Determines the redirect origin based on the deployment environment
 */
function getRedirectOrigin(request: NextRequest): string {
  // Always use the actual request origin to avoid cross-env redirects
  // (e.g., local dev should stay on localhost even if forwarded headers are set)
  return request.nextUrl.origin
}

/**
 * Logs OAuth callback events for debugging and monitoring
 */
function logOAuthEvent(
  event: 'success' | 'error' | 'missing_code' | 'invalid_redirect' | 'state_received',
  details: Record<string, any>
): void {
  const timestamp = new Date().toISOString()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  console.log(`[OAuth Callback] ${timestamp} [${requestId}] ${event}:`, {
    ...details,
    requestId,
    timestamp
  })
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(error: CallbackError, origin: string): NextResponse {
  const errorParams = new URLSearchParams({
    error: error.type,
    message: error.message
  })
  
  if (error.details) {
    errorParams.append('details', error.details)
  }
  
  return NextResponse.redirect(`${origin}/account?${errorParams.toString()}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = getRedirectOrigin(request)
  
  // Extract and validate OAuth parameters
  const params: OAuthCallbackParams = {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
    error: searchParams.get('error'),
    error_description: searchParams.get('error_description'),
    next: searchParams.get('next')
  }
  
  // Handle OAuth provider errors
  if (params.error) {
    logOAuthEvent('error', {
      providerError: params.error,
      providerErrorDescription: params.error_description,
      url: request.url
    })
    
    // Handle specific OAuth errors
    if (params.error === 'invalid_request' && params.error_description?.includes('bad_oauth_state')) {
      return createErrorResponse({
        type: 'auth_callback_error',
        message: 'OAuth state validation failed. Please try signing in again.',
        details: 'The OAuth state parameter did not match. This usually happens when the authentication session expires or is interrupted.'
      }, origin)
    }
    
    return createErrorResponse({
      type: 'auth_callback_error',
      message: 'OAuth provider returned an error',
      details: params.error_description || params.error
    }, origin)
  }
  
  // Validate code parameter
  if (!params.code) {
    logOAuthEvent('missing_code', {
      url: request.url,
      searchParams: Object.fromEntries(searchParams.entries())
    })
    
    return createErrorResponse({
      type: 'invalid_code',
      message: 'No authorization code provided'
    }, origin)
  }
  
  // Validate state parameter if present
  if (params.state) {
    // Log state parameter for debugging
    logOAuthEvent('state_received', {
      state: params.state,
      code: params.code?.substring(0, 10) + '...'
    })
  }
  
  // Validate and sanitize redirect path
  const validatedNext = validateRedirectPath(params.next || null)
  
  try {
    // Prepare redirect response up-front so we can attach cookies to it
    const response = NextResponse.redirect(`${origin}${validatedNext}`)

    // Create Supabase server client that bridges cookies onto the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          secure: process.env.NODE_ENV === 'production',
        },
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const adjustedOptions = {
                ...options,
                // Ensure cookies work on http://localhost during development
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                path: '/',
              }
              response.cookies.set(name, value, adjustedOptions)
            })
          },
        },
      }
    )

    // Exchange authorization code for a session (use code string as recommended)
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code as string)

    if (error) {
      logOAuthEvent('error', {
        supabaseError: error.message,
        errorCode: error.status,
        code: params.code.substring(0, 10) + '...'
      })

      return createErrorResponse({
        type: 'session_error',
        message: 'Failed to exchange code for session',
        details: error.message
      }, origin)
    }

    if (!data.session) {
      logOAuthEvent('error', {
        message: 'No session returned from code exchange',
        code: params.code.substring(0, 10) + '...'
      })

      return createErrorResponse({
        type: 'session_error',
        message: 'No session created from authorization code'
      }, origin)
    }

    // Ensure an application-level user record exists (id matches auth.users.id)
    try {
      const supabaseWithCookies = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return response.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
            },
          },
        }
      )

      // Check if user exists in public.user_data; if not, create it
      const userId = data.user!.id
      const email = data.user!.email || ''
      const fullName = (data.user as any)?.user_metadata?.full_name ||
                       (data.user as any)?.user_metadata?.name ||
                       'User'

      const { data: existingUser, error: selectErr } = await supabaseWithCookies
        .from('user_data')
        .select('user_id')
        .eq('user_id', userId)
        .single()

      if (selectErr && selectErr.code !== 'PGRST116') {
        console.error('Error checking existing app user:', selectErr)
      }

      if (!existingUser) {
        const { error: insertErr } = await supabaseWithCookies
          .from('user_data')
          .insert({
            user_id: userId,
            created_at: data.user!.created_at,
            updated_at: new Date().toISOString(),
          })

        if (insertErr) {
          console.error('Failed to create app user record:', insertErr)
        }
      }
    } catch (userCreateErr) {
      console.error('Unexpected error ensuring app user record:', userCreateErr)
    }

    // Log successful authentication and return response with cookies set
    logOAuthEvent('success', {
      userId: data.user?.id,
      email: data.user?.email,
      redirectTo: validatedNext,
      provider: data.user?.app_metadata?.provider
    })

    return response

  } catch (error) {
    // Handle unexpected errors (network issues, etc.)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logOAuthEvent('error', {
      unexpectedError: errorMessage,
      code: params.code.substring(0, 10) + '...'
    })
    
    return createErrorResponse({
      type: 'auth_callback_error',
      message: 'An unexpected error occurred during authentication',
      details: errorMessage
    }, origin)
  }
}
