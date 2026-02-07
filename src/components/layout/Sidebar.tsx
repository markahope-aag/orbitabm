'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useOrg } from '@/lib/context/OrgContext'
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
  Menu,
  X,
  ChevronDown
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
      { name: 'Organizations', href: '/organizations', icon: Building },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const { currentOrg, organizations, setCurrentOrgId, loading } = useOrg()

  const handleOrgChange = (orgId: string) => {
    setCurrentOrgId(orgId)
    setOrgDropdownOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-slate-900 text-white"
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
        w-64 bg-slate-900 text-white
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            {/* App Name */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-full" />
              </div>
              <h1 className="text-xl font-bold">OrbitABM</h1>
            </div>

            {/* Organization Selector */}
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="w-full text-left p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-between"
                disabled={loading}
              >
                <span className="text-sm font-medium truncate">
                  {loading ? 'Loading...' : (currentOrg?.name || 'Select Organization')}
                </span>
                <ChevronDown size={16} className={`transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Organization Dropdown */}
              {orgDropdownOpen && organizations && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-md shadow-lg border border-slate-600 z-10">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgChange(org.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors
                        ${currentOrg?.id === org.id ? 'bg-slate-700 text-blue-400' : ''}
                        first:rounded-t-md last:rounded-b-md
                      `}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{org.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {navigation.map((section) => (
              <div key={section.section}>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
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
                              ? 'bg-blue-600 text-white' 
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
        </div>
      </div>
    </>
  )
}