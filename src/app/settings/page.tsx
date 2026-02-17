'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useOrg } from '@/lib/context/OrgContext'
import { createClient } from '@/lib/supabase/client'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast'
import type { ProfileRow, OrganizationType } from '@/lib/types/database'
import { TemplatesContent } from '@/app/settings/templates/TemplatesContent'
import { ImportContent } from '@/app/import/ImportContent'
import { AuditLogContent } from '@/app/audit-log/AuditLogContent'
import { EmailSettingsTab } from '@/components/email/EmailSettingsTab'

// ---------------------------------------------------------------------------
// My Profile Tab
// ---------------------------------------------------------------------------

function MyProfileTab() {
  const { user } = useAuth()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
      }
      setLoading(false)
    }
    fetchProfile()
  }, [user, supabase])

  const handleSave = async () => {
    if (!user || !fullName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/profiles/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update profile')
      }
      // Also update Supabase auth metadata so sidebar reflects change
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
      showSuccessToast('Profile updated')
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-64" />
        <div className="h-10 bg-slate-200 rounded w-64" />
        <div className="h-10 bg-slate-200 rounded w-64" />
      </div>
    )
  }

  const roleBadgeColor = profile?.role === 'owner' ? 'purple' : profile?.role === 'admin' ? 'blue' : profile?.role === 'user' ? 'green' : 'gray'

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600">
          {user?.email}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <div className="px-3 py-2">
          <Badge label={profile?.role || 'viewer'} color={roleBadgeColor} />
        </div>
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
          placeholder="Enter your full name"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !fullName.trim()}
        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Organization Details Tab
// ---------------------------------------------------------------------------

function OrganizationDetailsTab() {
  const { user } = useAuth()
  const { currentOrg, currentOrgId, refreshOrganizations } = useOrg()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [type, setType] = useState<OrganizationType>('agency')
  const [website, setWebsite] = useState('')

  // Check admin status
  useEffect(() => {
    if (!user || !currentOrgId) return
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(data?.role === 'owner' || data?.role === 'admin')
      setLoading(false)
    }
    checkAdmin()
  }, [user, currentOrgId, supabase])

  // Sync form fields with org data
  useEffect(() => {
    if (!currentOrg) return
    setName(currentOrg.name)
    setSlug(currentOrg.slug)
    setType(currentOrg.type)
    setWebsite(currentOrg.website || '')
  }, [currentOrg])

  const handleSave = async () => {
    if (!currentOrgId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${currentOrgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, type, website: website || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update organization')
      }
      await refreshOrganizations()
      setEditing(false)
      showSuccessToast('Organization updated')
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  if (!currentOrg || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-64" />
        <div className="h-10 bg-slate-200 rounded w-64" />
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600">
            {currentOrg.name}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
          <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600">
            {currentOrg.slug}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600 capitalize">
            {currentOrg.type}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600">
            {currentOrg.website || '—'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
          >
            Edit Organization
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <label htmlFor="orgName" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input
          id="orgName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label htmlFor="orgSlug" className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
        <input
          id="orgSlug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label htmlFor="orgType" className="block text-sm font-medium text-slate-700 mb-1">Type</label>
        <select
          id="orgType"
          value={type}
          onChange={(e) => setType(e.target.value as OrganizationType)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
        >
          <option value="agency">Agency</option>
          <option value="client">Client</option>
        </select>
      </div>
      <div>
        <label htmlFor="orgWebsite" className="block text-sm font-medium text-slate-700 mb-1">Website</label>
        <input
          id="orgWebsite"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
          placeholder="https://example.com"
        />
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !slug.trim()}
          className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => {
            setEditing(false)
            // Reset to current values
            setName(currentOrg.name)
            setSlug(currentOrg.slug)
            setType(currentOrg.type)
            setWebsite(currentOrg.website || '')
          }}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Members Tab
// ---------------------------------------------------------------------------

interface MemberProfile {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

function MembersTab() {
  const { user } = useAuth()
  const { currentOrgId } = useOrg()
  const supabase = createClient()
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!currentOrgId) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('organization_id', currentOrgId)
      .order('created_at', { ascending: true })
    if (data) setMembers(data)
    setLoading(false)
  }, [currentOrgId, supabase])

  useEffect(() => {
    if (!user || !currentOrgId) return
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(data?.role === 'owner' || data?.role === 'admin')
    }
    checkAdmin()
    fetchMembers()
  }, [user, currentOrgId, supabase, fetchMembers])

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingId(memberId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId)
      if (error) throw error
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      showSuccessToast('Role updated')
    } catch {
      showErrorToast('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-200 rounded" />
        ))}
      </div>
    )
  }

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'purple' as const
      case 'admin': return 'blue' as const
      case 'user': return 'green' as const
      default: return 'gray' as const
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <div className="flex items-center space-x-2">
                    <span>{member.full_name || 'Unnamed'}</span>
                    {member.id === user?.id && (
                      <Badge label="You" color="green" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {isAdmin && member.id !== user?.id ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      disabled={updatingId === member.id}
                      className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <Badge label={member.role} color={roleBadgeColor(member.role)} />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      content: <MyProfileTab />,
    },
    {
      id: 'organization',
      label: 'Organization',
      content: <OrganizationDetailsTab />,
    },
    {
      id: 'members',
      label: 'Members',
      content: <MembersTab />,
    },
    {
      id: 'templates',
      label: 'Templates',
      content: <TemplatesContent />,
    },
    {
      id: 'import',
      label: 'Import Data',
      content: <ImportContent />,
    },
    {
      id: 'email',
      label: 'Email',
      content: <EmailSettingsTab />,
    },
    {
      id: 'audit',
      label: 'Audit Log',
      content: <AuditLogContent />,
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile, organization, and platform configuration.</p>
      </div>
      <Tabs tabs={tabs} defaultTab="profile" />
    </div>
  )
}
