'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, StatusBadge } from '@/components/ui'
import { 
  Mail,
  MessageSquare,
  Linkedin,
  Phone,
  Users,
  MoreHorizontal,
  CheckCircle
} from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type {
  ActivityRow,
  CampaignRow,
  ContactRow
} from '@/lib/types/database'

interface ActivityWithRelations extends ActivityRow {
  campaigns?: CampaignRow & { companies?: { name: string } }
  contacts?: ContactRow
}

const channelIcons = {
  mail: Mail,
  email: MessageSquare,
  linkedin: Linkedin,
  phone: Phone,
  in_person: Users,
  other: MoreHorizontal
}

export default function ActivitiesPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [activities, setActivities] = useState<ActivityWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<{
    status?: string
    channel?: string
    dateRange?: string
    customStartDate?: string
    customEndDate?: string
  }>({
    status: 'scheduled,overdue', // Default to show scheduled and overdue
    dateRange: 'current_and_next_week'
  })

  // Modal states
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithRelations | null>(null)

  // Form state for completion
  const [completionFormData, setCompletionFormData] = useState({
    completed_date: new Date().toISOString().split('T')[0],
    outcome: 'no_response',
    notes: ''
  })

  useEffect(() => {
    if (currentOrgId) {
      fetchData()
    }
  }, [currentOrgId, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query based on filters
      let query = supabase
        .from('activities')
        .select(`
          *,
          campaigns (name, companies (name)),
          contacts (first_name, last_name)
        `)
        .eq('organization_id', currentOrgId)

      // Apply status filter
      if (filters.status) {
        const statuses = filters.status.split(',')
        if (statuses.includes('overdue')) {
          // Handle overdue separately - scheduled activities past due date
          const today = new Date().toISOString().split('T')[0]
          const nonOverdueStatuses = statuses.filter(s => s !== 'overdue')
          
          if (nonOverdueStatuses.length > 0) {
            query = query.or(`status.in.(${nonOverdueStatuses.join(',')}),and(status.eq.scheduled,scheduled_date.lt.${today})`)
          } else {
            query = query.eq('status', 'scheduled').lt('scheduled_date', today)
          }
        } else {
          query = query.in('status', statuses)
        }
      }

      // Apply channel filter
      if (filters.channel) {
        query = query.eq('channel', filters.channel)
      }

      // Apply date range filter
      const today = new Date()
      let startDate: Date, endDate: Date

      switch (filters.dateRange) {
        case 'this_week':
          startDate = new Date(today)
          startDate.setDate(today.getDate() - today.getDay())
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6)
          break
        case 'next_week':
          startDate = new Date(today)
          startDate.setDate(today.getDate() + (7 - today.getDay()))
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6)
          break
        case 'current_and_next_week':
          startDate = new Date(today)
          startDate.setDate(today.getDate() - today.getDay())
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 13) // 2 weeks
          break
        case 'this_month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          break
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            startDate = new Date(filters.customStartDate)
            endDate = new Date(filters.customEndDate)
          } else {
            startDate = today
            endDate = today
          }
          break
        default:
          startDate = new Date(today)
          startDate.setDate(today.getDate() - today.getDay())
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 13)
      }

      if (filters.dateRange !== 'all') {
        query = query
          .gte('scheduled_date', startDate.toISOString().split('T')[0])
          .lte('scheduled_date', endDate.toISOString().split('T')[0])
      }

      const { data, error: activitiesError } = await query
        .order('scheduled_date', { ascending: true })
        .limit(1000)

      if (activitiesError) throw activitiesError
      setActivities(data as ActivityWithRelations[] || [])

    } catch (err) {
      console.error('Error fetching activities data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteActivity = async () => {
    if (!selectedActivity) return

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'completed',
          completed_date: completionFormData.completed_date,
          outcome: completionFormData.outcome,
          notes: completionFormData.notes
        })
        .eq('id', selectedActivity.id)

      if (error) throw error

      await fetchData()
      setCompleteModalOpen(false)
      setSelectedActivity(null)
      resetCompletionForm()
    } catch (err) {
      console.error('Error completing activity:', err)
    }
  }

  const openCompleteActivity = (activity: ActivityWithRelations) => {
    setSelectedActivity(activity)
    resetCompletionForm()
    setCompleteModalOpen(true)
  }

  const resetCompletionForm = () => {
    setCompletionFormData({
      completed_date: new Date().toISOString().split('T')[0],
      outcome: 'no_response',
      notes: ''
    })
  }

  const getActivityStatus = (activity: ActivityWithRelations) => {
    if (activity.status !== 'scheduled') return activity.status
    
    const today = new Date().toISOString().split('T')[0]
    if (activity.scheduled_date && activity.scheduled_date < today) {
      return 'overdue'
    }
    return 'scheduled'
  }

  const getActivityTypeDisplay = (activityType: string) => {
    return activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Activities</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Activities</h1>
          <p className="text-slate-600">Track and manage all campaign activities and touchpoints</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="scheduled,overdue">Scheduled + Overdue</option>
                <option value="scheduled">Scheduled</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
                <option value="">All Statuses</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
              <select
                value={filters.channel || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Channels</option>
                <option value="mail">Mail</option>
                <option value="email">Email</option>
                <option value="linkedin">LinkedIn</option>
                <option value="phone">Phone</option>
                <option value="in_person">In Person</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange || 'current_and_next_week'}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="current_and_next_week">Current + Next Week</option>
                <option value="this_week">This Week</option>
                <option value="next_week">Next Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Range</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.customStartDate || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, customStartDate: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.customEndDate || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, customEndDate: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activities Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <DataTable
            data={activities as unknown as Record<string, unknown>[]}
            loading={loading}
            columns={[
              {
                key: 'scheduled_date',
                header: 'Scheduled Date',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  return activity.scheduled_date ? new Date(activity.scheduled_date).toLocaleDateString() : 'N/A'
                }
              },
              {
                key: 'company',
                header: 'Company',
                render: (row) => (row as unknown as ActivityWithRelations).campaigns?.companies?.name || 'N/A'
              },
              {
                key: 'campaign',
                header: 'Campaign',
                render: (row) => (row as unknown as ActivityWithRelations).campaigns?.name || 'N/A'
              },
              {
                key: 'activity_type',
                header: 'Activity Type',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  return (
                    <StatusBadge status={activity.activity_type} />
                  )
                }
              },
              {
                key: 'channel',
                header: 'Channel',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  const ChannelIcon = channelIcons[activity.channel as keyof typeof channelIcons] || MoreHorizontal
                  return (
                    <div className="flex items-center">
                      <ChannelIcon className="w-4 h-4 text-slate-500 mr-2" />
                      <span className="text-sm capitalize">{activity.channel}</span>
                    </div>
                  )
                }
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  const status = getActivityStatus(activity)
                  return <StatusBadge status={status} />
                }
              },
              {
                key: 'outcome',
                header: 'Outcome',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  return activity.outcome ? (
                    <StatusBadge status={activity.outcome} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )
                }
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  return activity.contacts ? 
                    `${activity.contacts.first_name} ${activity.contacts.last_name}` : 
                    'N/A'
                }
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const activity = row as unknown as ActivityWithRelations
                  const status = getActivityStatus(activity)
                  
                  return (status === 'scheduled' || status === 'overdue') ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openCompleteActivity(activity)
                      }}
                      className="flex items-center px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )
                }
              }
            ]}
            onRowClick={(row) => {
              const activity = row as unknown as ActivityWithRelations
              if (activity.campaign_id) {
                window.location.href = `/campaigns/${activity.campaign_id}`
              }
            }}
            searchable={true}
            searchFields={['activity_type']}
            emptyMessage="No activities found"
          />
        </div>
      </div>

      {/* Complete Activity Modal */}
      <SlideOver
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Activity"
      >
        <div className="space-y-4">
          {selectedActivity && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-slate-900">
                {getActivityTypeDisplay(selectedActivity.activity_type)}
              </h4>
              <p className="text-sm text-slate-600">
                {selectedActivity.campaigns?.companies?.name} • {selectedActivity.campaigns?.name}
              </p>
              <p className="text-sm text-slate-500">
                Scheduled: {selectedActivity.scheduled_date ? new Date(selectedActivity.scheduled_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Completed Date *
            </label>
            <input
              type="date"
              value={completionFormData.completed_date}
              onChange={(e) => setCompletionFormData({ ...completionFormData, completed_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Outcome *
            </label>
            <select
              value={completionFormData.outcome}
              onChange={(e) => setCompletionFormData({ ...completionFormData, outcome: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="no_response">No Response</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="replied">Replied</option>
              <option value="meeting_booked">Meeting Booked</option>
              <option value="declined">Declined</option>
              <option value="voicemail">Voicemail</option>
              <option value="conversation">Conversation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={completionFormData.notes}
              onChange={(e) => setCompletionFormData({ ...completionFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteActivity}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
            >
              Complete Activity
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}