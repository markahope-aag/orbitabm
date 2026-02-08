'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users, Target, CheckSquare } from 'lucide-react'

interface PlatformMetrics {
  totalOrgs: number
  totalUsers: number
  activeCampaigns: number
  totalActivities: number
}

interface RecentSignup {
  id: string
  full_name: string | null
  created_at: string
  organization_id: string
  organizations?: { name: string } | null
}

interface OrgTypeCount {
  type: string
  count: number
}

interface RoleCount {
  role: string
  count: number
}

export function OverviewTab() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalOrgs: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    totalActivities: 0,
  })
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([])
  const [orgTypeCounts, setOrgTypeCounts] = useState<OrgTypeCount[]>([])
  const [roleCounts, setRoleCounts] = useState<RoleCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)

      const [
        orgsResult,
        usersResult,
        campaignsResult,
        activitiesResult,
        signupsResult,
        orgTypesResult,
        rolesResult,
      ] = await Promise.all([
        // Total organizations
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null),
        // Total users
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        // Active campaigns
        supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .is('deleted_at', null),
        // Total activities
        supabase
          .from('activities')
          .select('*', { count: 'exact', head: true }),
        // Recent signups
        supabase
          .from('profiles')
          .select('id, full_name, created_at, organization_id, organizations(name)')
          .order('created_at', { ascending: false })
          .limit(10),
        // Org types
        supabase
          .from('organizations')
          .select('type')
          .is('deleted_at', null),
        // User roles
        supabase
          .from('profiles')
          .select('role'),
      ])

      setMetrics({
        totalOrgs: orgsResult.count || 0,
        totalUsers: usersResult.count || 0,
        activeCampaigns: campaignsResult.count || 0,
        totalActivities: activitiesResult.count || 0,
      })

      setRecentSignups((signupsResult.data as unknown as RecentSignup[]) || [])

      // Count org types
      const typeMap: Record<string, number> = {}
      for (const org of orgTypesResult.data || []) {
        typeMap[org.type] = (typeMap[org.type] || 0) + 1
      }
      setOrgTypeCounts(Object.entries(typeMap).map(([type, count]) => ({ type, count })))

      // Count roles
      const roleMap: Record<string, number> = {}
      for (const profile of rolesResult.data || []) {
        roleMap[profile.role] = (roleMap[profile.role] || 0) + 1
      }
      setRoleCounts(Object.entries(roleMap).map(([role, count]) => ({ role, count })))
    } catch (err) {
      console.error('Error fetching platform overview:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-lg" />
      </div>
    )
  }

  const metricCards = [
    { label: 'Total Organizations', value: metrics.totalOrgs, icon: Building2, color: 'bg-cyan-100 text-cyan-600' },
    { label: 'Total Users', value: metrics.totalUsers, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Active Campaigns', value: metrics.activeCampaigns, icon: Target, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Total Activities', value: metrics.totalActivities, icon: CheckSquare, color: 'bg-purple-100 text-purple-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{card.label}</p>
                  <p className="text-2xl font-bold text-navy-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Signups */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Recent Signups</h3>
        </div>
        <div className="p-6">
          {recentSignups.length > 0 ? (
            <div className="space-y-3">
              {recentSignups.map((signup) => (
                <div key={signup.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-slate-900">{signup.full_name || 'Unnamed User'}</p>
                    <p className="text-sm text-slate-500">{signup.organizations?.name || 'No organization'}</p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {new Date(signup.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No signups yet</p>
          )}
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Orgs by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Organizations by Type</h3>
          </div>
          <div className="p-6">
            {orgTypeCounts.length > 0 ? (
              <div className="space-y-3">
                {orgTypeCounts.map(({ type, count }) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 capitalize">{type}</span>
                    <span className="text-sm font-bold text-navy-900">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Users by Role</h3>
          </div>
          <div className="p-6">
            {roleCounts.length > 0 ? (
              <div className="space-y-3">
                {roleCounts.map(({ role, count }) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 capitalize">{role}</span>
                    <span className="text-sm font-bold text-navy-900">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
