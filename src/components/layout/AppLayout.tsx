'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Check if current route is an auth route
  const isAuthRoute = pathname.startsWith('/auth')
  const isApiDocsRoute = pathname.startsWith('/api-docs')

  // Show loading spinner during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // For auth routes or API docs, don't show sidebar
  if (isAuthRoute || isApiDocsRoute || !user) {
    return <>{children}</>
  }

  // For authenticated users on app routes, show sidebar layout
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}