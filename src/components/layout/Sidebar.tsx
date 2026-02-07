'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import OrganizationSwitcher from '@/components/organizations/OrganizationSwitcher'
import {
  LayoutDashboard,
  Kanban,
  Building2,
  MapPin,
  Swords,
  TrendingUp,
  Target,
  BookOpen,
  CheckSquare,
  FileText,
  Layers,
  Users,
  Building,
  Upload,
  FileSearch,
  LayoutTemplate,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings
} from 'lucide-react'

const navigation = [
  {
    section: 'COMMAND CENTER',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Campaign Board', href: '/campaign-board', icon: Kanban },
    ]
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { name: 'Companies', href: '/companies', icon: Building2 },
      { name: 'Markets', href: '/markets', icon: MapPin },
      { name: 'Competitors', href: '/competitors', icon: Swords },
      { name: 'PE Tracker', href: '/pe-tracker', icon: TrendingUp },
      { name: 'Documents', href: '/documents', icon: FileSearch },
    ]
  },
  {
    section: 'OPERATIONS',
    items: [
      { name: 'Campaigns', href: '/campaigns', icon: Target },
      { name: 'Playbooks', href: '/playbooks', icon: BookOpen },
      { name: 'Activities', href: '/activities', icon: CheckSquare },
      { name: 'Assets', href: '/assets', icon: FileText },
    ]
  },
  {
    section: 'SETTINGS',
    items: [
      { name: 'Verticals', href: '/verticals', icon: Layers },
      { name: 'Contacts', href: '/contacts', icon: Users },
      { name: 'Import Data', href: '/import', icon: Upload },
      { name: 'Organizations', href: '/organizations', icon: Building },
      { name: 'Templates', href: '/settings/templates', icon: LayoutTemplate },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
                src="/brand/logo-light.svg"
                alt="OrbitABM"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </div>

            {/* Organization Selector */}
            <OrganizationSwitcher 
              onCreateNew={() => {
                // Navigate to organizations page
                window.location.href = '/organizations'
              }}
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {navigation.map((section) => (
              <div key={section.section}>
                <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3">
                  {section.section}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`
                            flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${isActive 
                              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                              : 'text-navy-300 hover:text-white hover:bg-navy-800'
                            }
                          `}
                        >
                          <Icon size={18} />
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
          
          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </>
  )
}

function UserMenu() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  if (!user) return null

  return (
    <div className="mt-auto border-t border-navy-800 pt-4">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center space-x-3 px-3 py-2 text-left text-navy-300 hover:text-white hover:bg-navy-800 rounded-md transition-colors"
        >
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="text-xs text-navy-400 truncate">
              {user.email}
            </p>
          </div>
          <ChevronDown 
            size={16} 
            className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-navy-800 border border-navy-700 rounded-md shadow-lg">
            <div className="py-1">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-navy-300 hover:text-white hover:bg-navy-700 transition-colors"
              >
                <Settings size={16} />
                <span className="text-sm">Settings</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-navy-300 hover:text-white hover:bg-navy-700 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}