'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import OrganizationSwitcher from '@/components/organizations/OrganizationSwitcher'
import {
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react'

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Close mobile menu on navigation
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-navy-950 text-white"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-navy-950 text-white
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-navy-800">
            {/* App Logo & Name */}
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src="/brand/logo-dark.svg"
                alt="OrbitABM"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </div>

            {/* Organization Display */}
            <OrganizationSwitcher />
          </div>

          {/* Navigation (server-rendered content) */}
          {children}

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </>
  )
}

function UserMenu() {
  const { user, signOut } = useAuth()

  // Skeleton while auth is loading
  if (!user) {
    return (
      <div className="mt-auto border-t border-navy-800 p-4">
        <div className="flex items-center space-x-3 animate-pulse">
          <div className="w-8 h-8 bg-navy-700 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-navy-700 rounded w-24 mb-2" />
            <div className="h-2 bg-navy-800 rounded w-16" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-auto border-t border-navy-800 p-4">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy-200 truncate">
            {user.user_metadata?.full_name || user.email}
          </p>
          <p className="text-xs text-navy-400 truncate">
            {user.email}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          title="Sign out"
          className="flex-shrink-0 p-1.5 text-navy-400 hover:text-white hover:bg-navy-800 rounded-md transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}
