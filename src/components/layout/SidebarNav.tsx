'use client'

import { NavLink } from './NavLink'
import { useOrg } from '@/lib/context/OrgContext'
import {
  LayoutDashboard,
  Kanban,
  Building2,
  MapPin,
  Swords,
  TrendingUp,
  Target,
  Crosshair,
  BookOpen,
  CheckSquare,
  FileText,
  Layers,
  Users,
  FileSearch,
  Settings,
  Shield,
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
      { name: 'Verticals', href: '/verticals', icon: Layers },
      { name: 'Documents', href: '/documents', icon: FileSearch },
    ]
  },
  {
    section: 'OPERATIONS',
    items: [
      { name: 'Campaigns', href: '/campaigns', icon: Target },
      { name: 'Targets', href: '/targets', icon: Crosshair },
      { name: 'Contacts', href: '/contacts', icon: Users },
      { name: 'Playbooks', href: '/playbooks', icon: BookOpen },
      { name: 'Activities', href: '/activities', icon: CheckSquare },
      { name: 'Assets', href: '/assets', icon: FileText },
    ]
  },
]

export function SidebarNav() {
  const { platformRole } = useOrg()
  const isPlatformAdmin = platformRole === 'platform_owner' || platformRole === 'platform_admin'

  return (
    <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
      {navigation.map((section) => (
        <div key={section.section}>
          <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3">
            {section.section}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.name} href={item.href}>
                  <Icon size={18} />
                  <span>{item.name}</span>
                </NavLink>
              )
            })}
          </ul>
        </div>
      ))}

      {/* Bottom links, visually separated */}
      <div className="pt-4 border-t border-navy-800">
        <ul className="space-y-1">
          <NavLink href="/settings">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          {isPlatformAdmin && (
            <NavLink href="/platform" variant="magenta">
              <Shield size={18} />
              <span>Platform Admin</span>
            </NavLink>
          )}
        </ul>
      </div>
    </nav>
  )
}
