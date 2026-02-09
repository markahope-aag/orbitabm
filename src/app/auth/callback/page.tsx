'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/login?error=callback_error')
          return
        }

        if (data.session) {
          // Honor a `next` param (e.g. from invite flow → set-password)
          const next = searchParams.get('next')
          if (next && next.startsWith('/')) {
            router.push(next)
          } else {
            router.push('/dashboard')
          }
        } else {
          // No session found, redirect to login
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        router.push('/auth/login?error=unexpected_error')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}