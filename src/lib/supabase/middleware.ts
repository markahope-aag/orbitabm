import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfig } from '@/lib/config'
import { securityMiddleware, logSecurityEvent } from '@/lib/security'

export async function updateSession(request: NextRequest) {
  // Apply security middleware first (CSRF, rate limiting)
  const securityResult = securityMiddleware(request)
  if (securityResult && securityResult.status !== 200) {
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

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the auth token
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // Reject unauthenticated API requests with 401
  if (isApiRoute && !user) {
    logSecurityEvent({
      type: 'suspicious_activity',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      path: request.nextUrl.pathname,
      details: { reason: 'unauthenticated_api_access' },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Let authenticated API requests through
  if (isApiRoute) {
    return supabaseResponse
  }

  // Unauthenticated user on protected route → login with redirectTo
  if (!user && !isAuthPage && request.nextUrl.pathname !== '/') {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Authenticated user on auth pages → dashboard (except callback and set-password)
  if (user && isAuthPage
    && !request.nextUrl.pathname.includes('/auth/callback')
    && !request.nextUrl.pathname.includes('/auth/set-password')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Root route redirects
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/auth/login', request.url)
    )
  }

  return supabaseResponse
}
