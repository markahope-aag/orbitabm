'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'
import { DataTable, Badge, ConfirmDialog } from '@/components/ui'
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast'
import { MoreVertical, ArrowRightLeft, ShieldPlus, ShieldOff } from 'lucide-react'
import type { PlatformRole, UserRole } from '@/lib/types/database'

interface UserWithOrg {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
  organization_id: string
  orgName: string
  platformRole: PlatformRole | null
  [key: string]: unknown
}

interface OrgOption {
  id: string
  name: string
}

const ORG_ROLES: UserRole[] = ['owner', 'admin', 'user', 'viewer']

const platformRoleColor = (role: PlatformRole | null) => {
  if (role === 'platform_owner') return 'purple' as const
  if (role === 'platform_admin') return 'blue' as const
  return 'gray' as const
}

export function UsersTab() {
  const supabase = createClient()
  const { platformRole: callerPlatformRole } = useOrg()
  const isOwner = callerPlatformRole === 'platform_owner'

  const [users, setUsers] = useState<UserWithOrg[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(true)

  // Action menu
  const [menuUserId, setMenuUserId] = useState<string | null>(null)

  // Reassign org dialog
  const [reassignUser, setReassignUser] = useState<UserWithOrg | null>(null)
  const [reassignOrgId, setReassignOrgId] = useState('')

  // Platform role confirm
  const [platformRoleAction, setPlatformRoleAction] = useState<{
    user: UserWithOrg
    action: 'grant' | 'revoke'
  } | null>(null)
  const [grantRole, setGrantRole] = useState<PlatformRole>('platform_admin')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const [profilesResult, platformRolesResult, orgsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, role, created_at, organization_id, organizations(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('platform_roles')
          .select('user_id, role'),
        supabase
          .from('organizations')
          .select('id, name')
          .is('deleted_at', null)
          .order('name'),
      ])

      if (profilesResult.error) throw profilesResult.error

      const platformMap: Record<string, PlatformRole> = {}
      for (const pr of platformRolesResult.data || []) {
        platformMap[pr.user_id] = pr.role as PlatformRole
      }

      const merged: UserWithOrg[] = (profilesResult.data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        full_name: p.full_name as string | null,
        role: p.role as UserRole,
        created_at: p.created_at as string,
        organization_id: p.organization_id as string,
        orgName: (p.organizations as { name: string } | null)?.name || 'Unknown',
        platformRole: platformMap[p.id as string] || null,
      }))

      setUsers(merged)
      setOrgs((orgsResult.data || []) as OrgOption[])
    } catch (err) {
      console.error('Error fetching users:', err)
      showErrorToast('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Close menu on outside click
  useEffect(() => {
    const handleClick = () => setMenuUserId(null)
    if (menuUserId) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [menuUserId])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/platform/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update role')
      }
      showSuccessToast('Role updated')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Role update failed')
    }
  }

  const handleReassignOrg = async () => {
    if (!reassignUser || !reassignOrgId) return
    try {
      const res = await fetch(`/api/platform/users/${reassignUser.id}/organization`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: reassignOrgId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reassign')
      }
      showSuccessToast('User reassigned')
      setReassignUser(null)
      setReassignOrgId('')
      fetchUsers()
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Reassign failed')
    }
  }

  const handlePlatformRoleAction = async () => {
    if (!platformRoleAction) return
    const { user, action } = platformRoleAction

    try {
      if (action === 'grant') {
        const res = await fetch(`/api/platform/users/${user.id}/platform-role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: grantRole }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to grant role')
        }
        showSuccessToast('Platform role granted')
      } else {
        const res = await fetch(`/api/platform/users/${user.id}/platform-role`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to revoke role')
        }
        showSuccessToast('Platform role revoked')
      }
      setPlatformRoleAction(null)
      fetchUsers()
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Platform role action failed')
    }
  }

  const columns = [
    {
      key: 'full_name',
      header: 'Name',
      render: (row: UserWithOrg) => (
        <span className="font-medium">{row.full_name || 'Unnamed'}</span>
      ),
    },
    {
      key: 'orgName',
      header: 'Organization',
    },
    {
      key: 'role',
      header: 'Org Role',
      render: (row: UserWithOrg) => (
        <select
          value={row.role}
          onChange={(e) => handleRoleChange(row.id, e.target.value as UserRole)}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          {ORG_ROLES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'platformRole',
      header: 'Platform Role',
      render: (row: UserWithOrg) => (
        row.platformRole
          ? <Badge label={row.platformRole} color={platformRoleColor(row.platformRole)} />
          : <span className="text-slate-400">—</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row: UserWithOrg) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: UserWithOrg) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuUserId(menuUserId === row.id ? null : row.id) }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuUserId === row.id && (
            <div className="absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-52">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setReassignUser(row)
                  setReassignOrgId(row.organization_id)
                  setMenuUserId(null)
                }}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Reassign Organization</span>
              </button>
              {isOwner && !row.platformRole && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPlatformRoleAction({ user: row, action: 'grant' })
                    setGrantRole('platform_admin')
                    setMenuUserId(null)
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <ShieldPlus className="w-4 h-4" />
                  <span>Grant Platform Role</span>
                </button>
              )}
              {isOwner && row.platformRole && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPlatformRoleAction({ user: row, action: 'revoke' })
                    setMenuUserId(null)
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <ShieldOff className="w-4 h-4" />
                  <span>Revoke Platform Role</span>
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchFields={['full_name']}
        emptyMessage="No users found"
        entityName="users"
      />

      {/* Reassign Org Dialog */}
      {reassignUser && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setReassignUser(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-navy-900 mb-4">Reassign Organization</h3>
              <p className="text-sm text-slate-600 mb-4">
                Move <strong>{reassignUser.full_name || 'Unnamed'}</strong> to a different organization.
              </p>
              <select
                value={reassignOrgId}
                onChange={(e) => setReassignOrgId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4"
              >
                {orgs.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setReassignUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReassignOrg}
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 rounded-md hover:bg-cyan-600"
                >
                  Reassign
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Grant Platform Role Dialog */}
      {platformRoleAction?.action === 'grant' && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setPlatformRoleAction(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-navy-900 mb-4">Grant Platform Role</h3>
              <p className="text-sm text-slate-600 mb-4">
                Grant a platform role to <strong>{platformRoleAction.user.full_name || 'Unnamed'}</strong>.
              </p>
              <select
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value as PlatformRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4"
              >
                <option value="platform_admin">Platform Admin</option>
                <option value="platform_owner">Platform Owner</option>
              </select>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setPlatformRoleAction(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlatformRoleAction}
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 rounded-md hover:bg-cyan-600"
                >
                  Grant Role
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Revoke Platform Role Confirm */}
      <ConfirmDialog
        open={platformRoleAction?.action === 'revoke'}
        onClose={() => setPlatformRoleAction(null)}
        onConfirm={handlePlatformRoleAction}
        title="Revoke Platform Role"
        message={`Are you sure you want to revoke the platform role from "${platformRoleAction?.user.full_name || 'Unnamed'}"?`}
      />
    </>
  )
}
