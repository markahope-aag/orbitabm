'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  Upload,
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
      { name: 'Import Data', href: '/import', icon: Upload },
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
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="w-full text-left p-3 rounded-md bg-navy-900 hover:bg-navy-800 transition-colors flex items-center justify-between border border-navy-700"
                disabled={loading}
              >
                <span className="text-sm font-medium truncate">
                  {loading ? 'Loading...' : (currentOrg?.name || 'Select Organization')}
                </span>
                <ChevronDown size={16} className={`transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Organization Dropdown */}
              {orgDropdownOpen && organizations && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-navy-900 rounded-md shadow-lg border border-navy-700 z-10">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgChange(org.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm hover:bg-navy-800 transition-colors
                        ${currentOrg?.id === org.id ? 'bg-navy-800 text-cyan-400' : ''}
                        first:rounded-t-md last:rounded-b-md
                      `}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-navy-300 capitalize">{org.type}</div>
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
        </div>
      </div>
    </>
  )
}