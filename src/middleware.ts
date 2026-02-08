import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfig } from '@/lib/config'
import { securityMiddleware, logSecurityEvent } from '@/lib/security'

export async function middleware(request: NextRequest) {
  // Apply security middleware first
  const securityResult = securityMiddleware(request)
  if (securityResult && securityResult.status !== 200) {
    // Log security violations
    if (securityResult.status === 429) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        path: request.nextUrl.pathname,
      })
    } else if (securityResult.status === 403) {
      logSecurityEvent({
        type: 'csrf_violation',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        path: request.nextUrl.pathname,
      })
    }
    
    return securityResult
  }
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get the current user session
  const { data: { session } } = await supabase.auth.getSession()

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isHealthCheck = request.nextUrl.pathname === '/api/health'

  // Allow health checks without authentication
  if (isHealthCheck) {
    return response
  }

  // Reject unauthenticated API requests with 401
  if (isApiRoute && !session) {
    logSecurityEvent({
      type: 'suspicious_activity',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      path: request.nextUrl.pathname,
      details: { reason: 'unauthenticated_api_access' },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Let authenticated API requests through (cookies already refreshed above)
  if (isApiRoute) {
    return response
  }

  // If user is not signed in and trying to access protected routes
  if (!session && !isAuthPage && request.nextUrl.pathname !== '/') {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and trying to access auth pages, redirect to dashboard
  if (session && isAuthPage && !request.nextUrl.pathname.includes('/auth/callback')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is signed in and accessing root, redirect to dashboard
  if (session && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is not signed in and accessing root, redirect to login
  if (!session && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}