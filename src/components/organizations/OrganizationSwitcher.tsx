'use client'

import { useState, useEffect } from 'react'
import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { OrganizationRow } from '@/lib/types/database'

type Organization = OrganizationRow

interface OrganizationSwitcherProps {
  onCreateNew?: () => void
  compact?: boolean
}

export default function OrganizationSwitcher({ 
  onCreateNew,
  compact = false 
}: OrganizationSwitcherProps) {
  const { currentOrg, setCurrentOrg } = useOrg()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyOrganizations()
  }, [])

  const fetchMyOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations/my-organizations')
      if (response.ok) {
        const result = await response.json()
        setOrganizations(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrganizationChange = (organization: Organization) => {
    setCurrentOrg(organization)
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-12'} bg-navy-800 rounded-md`} />
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-navy-300 mb-2">No organizations found</p>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Create your first organization
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <Listbox value={currentOrg ?? undefined} onChange={handleOrganizationChange}>
        <div className="relative">
          <Listbox.Button className={`relative w-full cursor-pointer rounded-md bg-navy-800 py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-navy-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            compact ? 'text-sm' : ''
          }`}>
            <span className="flex items-center">
              <div className={`flex-shrink-0 ${compact ? 'mr-2' : 'mr-3'}`}>
                <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} bg-cyan-500 rounded-full flex items-center justify-center`}>
                  <Building2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className={`block truncate text-white ${compact ? 'text-sm' : ''}`}>
                  {currentOrg?.name || 'Select Organization'}
                </span>
                {!compact && currentOrg && (
                  <span className="block truncate text-xs text-navy-300">
                    {currentOrg.type === 'agency' ? 'Agency' : 'Client'}
                  </span>
                )}
              </div>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown
                className="h-5 w-5 text-navy-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {organizations.map((organization) => (
                <Listbox.Option
                  key={organization.id}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-cyan-100 text-cyan-900' : 'text-gray-900'
                    }`
                  }
                  value={organization}
                >
                  {({ selected }) => (
                    <>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            organization.type === 'agency' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            <Building2 className={`h-3 w-3 ${
                              organization.type === 'agency' ? 'text-purple-600' : 'text-blue-600'
                            }`} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {organization.name}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {organization.type === 'agency' ? 'Agency' : 'Client'} • /{organization.slug}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
              
              {onCreateNew && (
                <>
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={onCreateNew}
                    className="relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="block truncate font-medium">
                      Create New Organization
                    </span>
                  </button>
                </>
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}