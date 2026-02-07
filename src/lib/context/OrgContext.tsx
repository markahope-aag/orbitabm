'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useOrganizations } from '@/lib/supabase/hooks'
import type { OrganizationRow } from '@/lib/types/database'

interface OrgContextType {
  currentOrgId: string | null
  currentOrg: OrganizationRow | null
  organizations: OrganizationRow[] | null
  setCurrentOrgId: (orgId: string) => void
  loading: boolean
  error: string | null
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

interface OrgProviderProps {
  children: ReactNode
}

export function OrgProvider({ children }: OrgProviderProps) {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const { data: organizations, loading, error } = useOrganizations()

  // Set default organization (Asymmetric Marketing) when organizations load
  useEffect(() => {
    if (organizations && organizations.length > 0 && !currentOrgId) {
      // Find Asymmetric Marketing org or default to first org
      const asymmetricOrg = organizations.find(org => org.slug === 'asymmetric')
      const defaultOrg = asymmetricOrg || organizations[0]
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setCurrentOrgId(defaultOrg.id), 0)
    }
  }, [organizations, currentOrgId])

  // Find current organization object
  const currentOrg = organizations?.find(org => org.id === currentOrgId) || null

  const value: OrgContextType = {
    currentOrgId,
    currentOrg,
    organizations,
    setCurrentOrgId,
    loading,
    error
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