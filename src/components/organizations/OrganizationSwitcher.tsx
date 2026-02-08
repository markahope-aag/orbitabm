'use client'

import { Building2 } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'

export default function OrganizationSwitcher() {
  const { currentOrg } = useOrg()

  if (!currentOrg) {
    return (
      <div className="animate-pulse h-12 bg-navy-800 rounded-md" />
    )
  }

  return (
    <div className="flex items-center rounded-md bg-navy-800 py-2 px-3 ring-1 ring-navy-700">
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="block truncate text-white">
          {currentOrg.name}
        </span>
        <span className="block truncate text-xs text-navy-300">
          {currentOrg.type === 'agency' ? 'Agency' : 'Client'}
        </span>
      </div>
    </div>
  )
}
