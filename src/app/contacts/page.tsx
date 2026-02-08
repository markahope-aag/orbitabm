'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, StatusBadge } from '@/components/ui'
import { Plus, ExternalLink, Check } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  ContactRow, 
  CompanyRow
} from '@/lib/types/database'

interface ContactWithCompany extends ContactRow {
  companies?: CompanyRow
}

export default function ContactsPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<{
    company_id?: string
    relationship_status?: string
  }>({})

  // Modal states
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactWithCompany | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_id: '',
    title: '',
    email: '',
    phone: '',
    linkedin_url: '',
    is_primary: false,
    relationship_status: 'unknown',
    notes: ''
  })

  useEffect(() => {
    if (currentOrgId) {
      fetchData()
    }
  }, [currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch contacts with company information
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          companies (*)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('first_name')

      if (contactsError) throw contactsError
      setContacts(contactsData as ContactWithCompany[] || [])

      // Fetch companies for dropdown
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])

    } catch (err) {
      console.error('Error fetching contacts data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentOrgId || !formData.first_name.trim() || !formData.last_name.trim()) return

    try {
      setSaving(true)

      const payload = {
        ...formData,
        organization_id: currentOrgId
      }

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(payload)
          .eq('id', editingContact.id)

        if (error) throw error
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert([payload])

        if (error) throw error
      }

      await fetchData()
      setContactModalOpen(false)
      setEditingContact(null)
      resetForm()
    } catch (err) {
      console.error('Error saving contact:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (contact: ContactWithCompany) => {
    setEditingContact(contact)
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      company_id: contact.company_id,
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedin_url: contact.linkedin_url || '',
      is_primary: contact.is_primary,
      relationship_status: contact.relationship_status || 'unknown',
      notes: contact.notes || ''
    })
    setContactModalOpen(true)
  }

  const handleDelete = async (contact: ContactWithCompany) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', contact.id)

      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Error deleting contact:', err)
    }
  }

  const openAddContact = () => {
    setEditingContact(null)
    resetForm()
    setContactModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      company_id: '',
      title: '',
      email: '',
      phone: '',
      linkedin_url: '',
      is_primary: false,
      relationship_status: 'unknown',
      notes: ''
    })
  }

  // Filter contacts based on selected filters
  const filteredContacts = contacts.filter(contact => {
    if (filters.company_id && contact.company_id !== filters.company_id) return false
    if (filters.relationship_status && contact.relationship_status !== filters.relationship_status) return false
    return true
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-8"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Contacts</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-navy-900 mb-2">Contacts</h1>
              <p className="text-slate-600">Manage your contact relationships and engagement</p>
            </div>
            <button
              onClick={openAddContact}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <select
                value={filters.company_id || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, company_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship Status</label>
              <select
                value={filters.relationship_status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, relationship_status: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="unknown">Unknown</option>
                <option value="identified">Identified</option>
                <option value="connected">Connected</option>
                <option value="engaged">Engaged</option>
                <option value="responsive">Responsive</option>
                <option value="meeting_held">Meeting Held</option>
                <option value="client">Client</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <DataTable
            data={filteredContacts as unknown as Record<string, unknown>[]}
            loading={loading}
            entityName="contacts"
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => {
                  const contact = row as unknown as ContactWithCompany
                  return (
                    <div className="font-medium text-slate-900">
                      {contact.first_name} {contact.last_name}
                    </div>
                  )
                }
              },
              {
                key: 'company',
                header: 'Company',
                render: (row) => (row as unknown as ContactWithCompany).companies?.name || 'N/A'
              },
              {
                key: 'title',
                header: 'Title',
                render: (row) => (row as unknown as ContactWithCompany).title || 'N/A'
              },
              {
                key: 'email',
                header: 'Email',
                render: (row) => (row as unknown as ContactWithCompany).email || 'N/A'
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (row) => (row as unknown as ContactWithCompany).phone || 'N/A'
              },
              {
                key: 'linkedin',
                header: 'LinkedIn',
                render: (row) => {
                  const contact = row as unknown as ContactWithCompany
                  return contact.linkedin_url ? (
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:text-cyan-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )
                }
              },
              {
                key: 'relationship_status',
                header: 'Relationship Status',
                render: (row) => (
                  <StatusBadge status={(row as unknown as ContactWithCompany).relationship_status || 'unknown'} />
                )
              },
              {
                key: 'primary',
                header: 'Primary',
                render: (row) => {
                  const contact = row as unknown as ContactWithCompany
                  return contact.is_primary ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )
                }
              }
            ]}
            onRowClick={(row) => handleEdit(row as unknown as ContactWithCompany)}
            searchable={true}
            searchFields={['first_name', 'last_name', 'email']}
            emptyMessage="No contacts found"
          />
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      <SlideOver
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company *
            </label>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Relationship Status
            </label>
            <select
              value={formData.relationship_status}
              onChange={(e) => setFormData({ ...formData, relationship_status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="unknown">Unknown</option>
              <option value="identified">Identified</option>
              <option value="connected">Connected</option>
              <option value="engaged">Engaged</option>
              <option value="responsive">Responsive</option>
              <option value="meeting_held">Meeting Held</option>
              <option value="client">Client</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_primary" className="text-sm font-medium text-slate-700">
              Primary Contact
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setContactModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            {editingContact && (
              <button
                onClick={() => handleDelete(editingContact)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}