import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for admin routes completely - they have their own auth
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Middleware auth error:', error)
    }
    
    console.log('Middleware check:', { 
      pathname: request.nextUrl.pathname, 
      hasUser: !!user, 
      userId: user?.id?.substring(0, 8) + '...' || 'none'
    })

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/reading',
    '/writing',
    '/solver',
    '/search',
    '/exam-prep',
    '/math-viz',
    '/profile',
    '/calendar',
    '/settings'
  ]

  // Define public routes that should redirect to dashboard if user is authenticated
  const publicRoutes = [
    '/account',
    '/landing',
    '/'
  ]

  // Skip middleware for certain paths to prevent issues
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname === '/favicon.ico' ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/avatars') ||
      pathname.startsWith('/videos') ||
      pathname.includes('.') // Skip files with extensions
  ) {
    return response
  }

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/account/')

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    console.log('Redirecting unauthenticated user from protected route:', pathname)
    // Redirect to sign-in page
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/account'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access public auth routes
  if (user && isPublicRoute && !pathname.startsWith('/account/verify-email')) {
    console.log('Redirecting authenticated user from auth route:', pathname)
    // Only redirect from the root account page, not all account pages
    if (pathname === '/account') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      // Add a timestamp to prevent caching issues
      redirectUrl.searchParams.set('t', Date.now().toString())
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
  
  } catch (error) {
    console.error('Middleware error:', error)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public image files)
     * - api (API routes)
     * - admin (admin routes with their own auth)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api|admin).*)',
  ],
}