'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { OrganizationRow, PlatformRole, UserRole } from '@/lib/types/database'

interface OrgContextType {
  currentOrgId: string | null
  currentOrg: OrganizationRow | null
  homeOrgId: string | null
  organizations: OrganizationRow[] | null
  setCurrentOrg: (org: OrganizationRow) => void
  setCurrentOrgId: (orgId: string) => void
  loading: boolean
  error: string | null
  refreshOrganizations: () => Promise<void>
  platformRole: PlatformRole | null
  isPlatformUser: boolean
  userRole: UserRole | null
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

interface OrgProviderProps {
  children: ReactNode
}

export function OrgProvider({ children }: OrgProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [homeOrgId, setHomeOrgId] = useState<string | null>(null)
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations(null)
      setCurrentOrgId(null)
      setHomeOrgId(null)
      setPlatformRole(null)
      setUserRole(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/organizations/my-organizations')
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const result = await response.json()
      const orgs = result.data || []
      setOrganizations(orgs)
      setPlatformRole(result.platform_role ?? null)
      setUserRole(result.user_role ?? null)
      setHomeOrgId(result.current_organization_id ?? null)

      // Set current organization
      if (orgs.length > 0) {
        // Use the organization from the API response or default to first
        const defaultOrgId = result.current_organization_id || orgs[0].id
        const defaultOrg = orgs.find((org: OrganizationRow) => org.id === defaultOrgId) || orgs[0]
        setCurrentOrgId(defaultOrg.id)
      } else {
        setCurrentOrgId(null)
      }
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load organizations')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch organizations when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchOrganizations()
    }
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Find current organization object
  const currentOrg = organizations?.find(org => org.id === currentOrgId) || null

  const setCurrentOrg = (org: OrganizationRow) => {
    setCurrentOrgId(org.id)
    // Persist to localStorage and cookie for server-side resolution
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentOrgId', org.id)
      document.cookie = `orbit_current_org=${org.id}; path=/; max-age=31536000; samesite=lax`
    }
  }

  const handleSetCurrentOrgId = (orgId: string) => {
    setCurrentOrgId(orgId)
    // Persist to localStorage and cookie for server-side resolution
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentOrgId', orgId)
      document.cookie = `orbit_current_org=${orgId}; path=/; max-age=31536000; samesite=lax`
    }
  }

  // Load persisted organization on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && organizations && organizations.length > 0 && !currentOrgId) {
      const persistedOrgId = localStorage.getItem('currentOrgId')
      if (persistedOrgId && organizations.find(org => org.id === persistedOrgId)) {
        setCurrentOrgId(persistedOrgId)
      }
    }
  }, [organizations, currentOrgId])

  const value: OrgContextType = {
    currentOrgId,
    currentOrg,
    homeOrgId,
    organizations,
    setCurrentOrg,
    setCurrentOrgId: handleSetCurrentOrgId,
    loading: loading || authLoading,
    error,
    refreshOrganizations: fetchOrganizations,
    platformRole,
    isPlatformUser: platformRole !== null,
    userRole
  }

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider')
  }
  return context
}
