'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { useOrg } from '@/lib/context/OrgContext'
import { usePathname } from 'next/navigation'
import { Building2, LogOut } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
}

export function AppLayout({ children, sidebar }: AppLayoutProps) {
  const { user, loading: authLoading, signOut } = useAuth()
  const { organizations, loading: orgLoading, error: orgError, refreshOrganizations } = useOrg()
  const pathname = usePathname()

  // Check if current route is an auth route
  const isAuthRoute = pathname.startsWith('/auth')
  const isApiDocsRoute = pathname.startsWith('/api-docs')

  // Auth and API docs routes: no sidebar
  if (isAuthRoute || isApiDocsRoute) {
    return <>{children}</>
  }

  // Unauthenticated and done loading: no sidebar (auth context will redirect)
  if (!authLoading && !user) {
    return <>{children}</>
  }

  // Determine what to show in the main content area
  let mainContent: React.ReactNode

  if (authLoading) {
    mainContent = (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  } else if (orgLoading) {
    mainContent = (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    )
  } else if (!organizations || organizations.length === 0) {
    mainContent = (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-7 h-7 text-cyan-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              No Organization Found
            </h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {orgError
                ? 'We had trouble loading your workspace. This is usually temporary.'
                : 'Your account isn\u2019t linked to an organization yet. This typically happens right after signing up \u2014 an admin needs to add you, or your profile is still being set up.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => refreshOrganizations()}
                className="w-full px-4 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => signOut()}
                className="w-full px-4 py-2.5 bg-white text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-5">
              Signed in as {user?.email}
            </p>
          </div>
        </div>
      </div>
    )
  } else {
    mainContent = children
  }

  // For all app routes: always render sidebar + main shell
  return (
    <div className="flex h-screen bg-slate-50">
      {sidebar}
      <main className="flex-1 overflow-auto">
        {mainContent}
      </main>
    </div>
  )
}
