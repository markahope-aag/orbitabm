'use client'

import { useState } from 'react'
import { Building2, Globe, Edit, Trash2, Users, MoreVertical } from 'lucide-react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

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

interface OrganizationCardProps {
  organization: Organization
  onEdit: (organization: Organization) => void
  onDelete: (organization: Organization) => void
  onSelect?: (organization: Organization) => void
  isSelected?: boolean
  showActions?: boolean
}

export default function OrganizationCard({
  organization,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
  showActions = true
}: OrganizationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${organization.name}"? This action cannot be undone.`)) {
      setIsDeleting(true)
      try {
        await onDelete(organization)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const userCount = organization.profiles?.[0]?.count || 0

  return (
    <div 
      className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect ? () => onSelect(organization) : undefined}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`p-2 rounded-lg ${
                organization.type === 'agency' ? 'bg-purple-100' : 'bg-blue-100'
              }`}>
                <Building2 className={`h-5 w-5 ${
                  organization.type === 'agency' ? 'text-purple-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {organization.name}
                </h3>
                <p className="text-sm text-gray-500">
                  /{organization.slug}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                organization.type === 'agency' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {organization.type === 'agency' ? 'Agency' : 'Client'}
              </span>
              
              {userCount > 0 && (
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  {userCount} user{userCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {organization.website && (
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <Globe className="h-4 w-4 mr-2" />
                <a 
                  href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {organization.website}
                </a>
              </div>
            )}

            {organization.notes && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {organization.notes}
              </p>
            )}
          </div>

          {showActions && (
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button 
                  className="inline-flex w-full justify-center rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(organization)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Organization
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-red-50 text-red-700' : 'text-gray-900'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete()
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting ? 'Deleting...' : 'Delete Organization'}
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Created {new Date(organization.created_at).toLocaleDateString()}</span>
            <span>Updated {new Date(organization.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}