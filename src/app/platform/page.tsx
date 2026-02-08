'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrg } from '@/lib/context/OrgContext'
import { Tabs } from '@/components/ui'
import { Shield } from 'lucide-react'
import { OverviewTab } from './components/OverviewTab'
import { OrganizationsTab } from './components/OrganizationsTab'
import { UsersTab } from './components/UsersTab'
import { BillingTab } from './components/BillingTab'

export default function PlatformPage() {
  const { isPlatformUser, loading } = useOrg()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isPlatformUser) {
      router.push('/dashboard')
    }
  }, [isPlatformUser, loading, router])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isPlatformUser) return null

  const tabs = [
    { id: 'overview', label: 'Overview', content: <OverviewTab /> },
    { id: 'organizations', label: 'Organizations', content: <OrganizationsTab /> },
    { id: 'users', label: 'Users', content: <UsersTab /> },
    { id: 'billing', label: 'Billing', content: <BillingTab /> },
  ]

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-cyan-600" />
            <h1 className="text-3xl font-bold text-navy-900">Platform Administration</h1>
          </div>
          <p className="text-slate-600">Manage organizations, users, and platform settings across all tenants.</p>
        </div>

        <Tabs tabs={tabs} defaultTab="overview" />
      </div>
    </div>
  )
}
