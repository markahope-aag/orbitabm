'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Building2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import OrganizationCard from '@/components/organizations/OrganizationCard'
import OrganizationModal from '@/components/organizations/OrganizationModal'
import { useAuth } from '@/lib/context/AuthContext'
import toast from 'react-hot-toast'

interface Organization {
  id: string
  name: string
  slug: string
  type: 'agency' | 'client'
  website?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  profiles?: { count: number }[]
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function OrganizationsPage() {
  useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'agency' | 'client'>('all')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | undefined>()
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [pagination.page, searchTerm, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (typeFilter !== 'all') params.append('type', typeFilter)

      const response = await fetch(`/api/organizations?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const result = await response.json()
      setOrganizations(result.data || [])
      setPagination(result.pagination)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrganization = async (data: Omit<Organization, 'id'>) => {
    try {
      setModalLoading(true)
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create organization')
      }

      await response.json()
      toast.success('Organization created successfully')
      setIsModalOpen(false)
      setEditingOrganization(undefined)
      fetchOrganizations() // Refresh the list
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create organization')
    } finally {
      setModalLoading(false)
    }
  }

  const handleUpdateOrganization = async (data: Omit<Organization, 'id'>) => {
    if (!editingOrganization) return

    try {
      setModalLoading(true)
      const response = await fetch(`/api/organizations/${editingOrganization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update organization')
      }

      toast.success('Organization updated successfully')
      setIsModalOpen(false)
      setEditingOrganization(undefined)
      fetchOrganizations() // Refresh the list
    } catch (error) {
      console.error('Error updating organization:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update organization')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteOrganization = async (organization: Organization) => {
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete organization')
      }

      toast.success('Organization deleted successfully')
      fetchOrganizations() // Refresh the list
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization')
    }
  }

  const handleEditOrganization = (organization: Organization) => {
    setEditingOrganization(organization)
    setIsModalOpen(true)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (type: 'all' | 'agency' | 'client') => {
    setTypeFilter(type)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Organizations"
        description="Manage your organizations and switch between different accounts"
        action={{
          label: "Create Organization",
          icon: Plus,
          onClick: () => {
            setEditingOrganization(undefined)
            setIsModalOpen(true)
          }
        }}
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search organizations..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => handleFilterChange(e.target.value as 'all' | 'agency' | 'client')}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="agency">Agencies</option>
            <option value="client">Clients</option>
          </select>
        </div>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading organizations...</span>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || typeFilter !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by creating your first organization.'
            }
          </p>
          {(!searchTerm && typeFilter === 'all') && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setEditingOrganization(undefined)
                  setIsModalOpen(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                organization={organization}
                onEdit={handleEditOrganization}
                onDelete={handleDeleteOrganization}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span>{' '}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Organization Modal */}
      <OrganizationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOrganization(undefined)
        }}
        organization={editingOrganization}
        onSubmit={editingOrganization ? handleUpdateOrganization : handleCreateOrganization}
        isLoading={modalLoading}
      />
    </div>
  )
}