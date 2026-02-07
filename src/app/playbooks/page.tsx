'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SlideOver, StatusBadge } from '@/components/ui'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Linkedin, 
  Phone, 
  Users, 
  MoreHorizontal,
  Calendar,
  Clock,
  Target
} from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  PlaybookTemplateRow, 
  PlaybookStepRow,
  VerticalRow
} from '@/lib/types/database'

interface PlaybookWithSteps extends PlaybookTemplateRow {
  playbook_steps?: PlaybookStepRow[]
  verticals?: VerticalRow
  step_count?: number
  total_duration?: number
}

const channelIcons = {
  mail: Mail,
  email: MessageSquare,
  linkedin: Linkedin,
  phone: Phone,
  in_person: Users,
  other: MoreHorizontal
}

export default function PlaybooksPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [playbooks, setPlaybooks] = useState<PlaybookWithSteps[]>([])
  const [verticals, setVerticals] = useState<VerticalRow[]>([])
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookWithSteps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [playbookModalOpen, setPlaybookModalOpen] = useState(false)
  const [stepModalOpen, setStepModalOpen] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<PlaybookWithSteps | null>(null)
  const [editingStep, setEditingStep] = useState<PlaybookStepRow | null>(null)

  // Form states
  const [playbookFormData, setPlaybookFormData] = useState<Partial<PlaybookTemplateRow>>({
    name: '',
    description: '',
    vertical_id: null,
    is_active: true
  })

  const [stepFormData, setStepFormData] = useState<Partial<PlaybookStepRow>>({
    step_number: 1,
    day_offset: 1,
    channel: 'email',
    title: '',
    description: '',
    asset_type_required: 'none',
    is_pivot_trigger: false
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

      // Fetch playbooks with steps and verticals
      const { data: playbooksData, error: playbooksError } = await supabase
        .from('playbook_templates')
        .select(`
          *,
          verticals (name),
          playbook_steps (*)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (playbooksError) throw playbooksError

      const playbooksWithStats = (playbooksData || []).map(playbook => {
        const steps = playbook.playbook_steps || []
        const maxDayOffset = steps.length > 0 ? Math.max(...steps.map((s: PlaybookStepRow) => s.day_offset)) : 0
        
        return {
          ...playbook,
          step_count: steps.length,
          total_duration: maxDayOffset
        }
      })
      
      setPlaybooks(playbooksWithStats as PlaybookWithSteps[])

      // Fetch verticals for dropdown
      const { data: verticalsData, error: verticalsError } = await supabase
        .from('verticals')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (verticalsError) throw verticalsError
      setVerticals(verticalsData || [])

      // Select first playbook if none selected
      if (!selectedPlaybook && playbooksWithStats.length > 0) {
        setSelectedPlaybook(playbooksWithStats[0])
      }

    } catch (err) {
      console.error('Error fetching playbooks data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePlaybook = async () => {
    if (!currentOrgId || !playbookFormData.name?.trim()) return

    try {
      const payload = {
        ...playbookFormData,
        organization_id: currentOrgId
      }

      if (editingPlaybook) {
        // Update existing playbook
        const { error } = await supabase
          .from('playbook_templates')
          .update(payload)
          .eq('id', editingPlaybook.id)

        if (error) throw error
      } else {
        // Create new playbook
        const { error } = await supabase
          .from('playbook_templates')
          .insert([payload])

        if (error) throw error
      }

      await fetchData()
      setPlaybookModalOpen(false)
      setEditingPlaybook(null)
      resetPlaybookForm()
    } catch (err) {
      console.error('Error saving playbook:', err)
    }
  }

  const handleSaveStep = async () => {
    if (!currentOrgId || !selectedPlaybook || !stepFormData.title?.trim()) return

    try {
      const payload = {
        ...stepFormData,
        organization_id: currentOrgId,
        playbook_template_id: selectedPlaybook.id
      }

      if (editingStep) {
        // Update existing step
        const { error } = await supabase
          .from('playbook_steps')
          .update(payload)
          .eq('id', editingStep.id)

        if (error) throw error
      } else {
        // Create new step
        const { error } = await supabase
          .from('playbook_steps')
          .insert([payload])

        if (error) throw error
      }

      await fetchData()
      setStepModalOpen(false)
      setEditingStep(null)
      resetStepForm()
    } catch (err) {
      console.error('Error saving step:', err)
    }
  }

  const handleDeleteStep = async (step: PlaybookStepRow) => {
    if (!confirm('Are you sure you want to delete this step?')) return

    try {
      const { error } = await supabase
        .from('playbook_steps')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', step.id)

      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Error deleting step:', err)
    }
  }

  const handleUpdatePlaybookField = async (field: string, value: string | boolean | null) => {
    if (!selectedPlaybook) return

    try {
      const { error } = await supabase
        .from('playbook_templates')
        .update({ [field]: value })
        .eq('id', selectedPlaybook.id)

      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Error updating playbook:', err)
    }
  }

  const openAddPlaybook = () => {
    setEditingPlaybook(null)
    resetPlaybookForm()
    setPlaybookModalOpen(true)
  }

  const openAddStep = () => {
    setEditingStep(null)
    const nextStepNumber = selectedPlaybook?.playbook_steps?.length ? 
      Math.max(...selectedPlaybook.playbook_steps.map(s => s.step_number)) + 1 : 1
    
    setStepFormData({
      step_number: nextStepNumber,
      day_offset: 1,
      channel: 'email',
      title: '',
      description: '',
      asset_type_required: 'none',
      is_pivot_trigger: false
    })
    setStepModalOpen(true)
  }

  const openEditStep = (step: PlaybookStepRow) => {
    setEditingStep(step)
    setStepFormData(step)
    setStepModalOpen(true)
  }

  const resetPlaybookForm = () => {
    setPlaybookFormData({
      name: '',
      description: '',
      vertical_id: null,
      is_active: true
    })
  }

  const resetStepForm = () => {
    setStepFormData({
      step_number: 1,
      day_offset: 1,
      channel: 'email',
      title: '',
      description: '',
      asset_type_required: 'none',
      is_pivot_trigger: false
    })
  }

  // Create seed playbook
  const createSeedPlaybook = async () => {
    if (!currentOrgId) return

    try {
      // Find HVAC vertical
      const hvacVertical = verticals.find(v => v.name.toLowerCase().includes('hvac'))
      
      // Create playbook
      const { data: playbook, error: playbookError } = await supabase
        .from('playbook_templates')
        .insert([{
          organization_id: currentOrgId,
          name: 'HVAC ABM — 35-Day Sequence',
          description: 'Comprehensive 35-day outbound sequence for HVAC companies',
          vertical_id: hvacVertical?.id || null,
          is_active: true
        }])
        .select()
        .single()

      if (playbookError) throw playbookError

      // Create steps
      const steps = [
        { step_number: 1, day_offset: 1, channel: 'mail', title: 'Strategic Blueprint Delivery', asset_type_required: 'blueprint' },
        { step_number: 2, day_offset: 3, channel: 'linkedin', title: 'LinkedIn Connection Request', asset_type_required: 'none' },
        { step_number: 3, day_offset: 5, channel: 'email', title: 'Email Follow-Up — Package Reference', asset_type_required: 'none' },
        { step_number: 4, day_offset: 10, channel: 'email', title: 'Website & SEO Audit Delivery', asset_type_required: 'website_audit' },
        { step_number: 5, day_offset: 18, channel: 'email', title: 'Local Market Presence Report', asset_type_required: 'market_report' },
        { step_number: 6, day_offset: 25, channel: 'linkedin', title: 'LinkedIn Content Engagement', asset_type_required: 'none' },
        { step_number: 7, day_offset: 28, channel: 'phone', title: 'The Call', asset_type_required: 'none' },
        { step_number: 8, day_offset: 35, channel: 'mail', title: 'Breakup Note + Pivot', asset_type_required: 'breakup_note', is_pivot_trigger: true }
      ]

      const stepsPayload = steps.map(step => ({
        ...step,
        organization_id: currentOrgId,
        playbook_template_id: playbook.id,
        description: `Step ${step.step_number} of the HVAC ABM sequence`
      }))

      const { error: stepsError } = await supabase
        .from('playbook_steps')
        .insert(stepsPayload)

      if (stepsError) throw stepsError

      await fetchData()
    } catch (err) {
      console.error('Error creating seed playbook:', err)
    }
  }

  const sortedSteps = selectedPlaybook?.playbook_steps?.sort((a, b) => a.step_number - b.step_number) || []

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Playbooks</h1>
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
              <h1 className="text-3xl font-bold text-navy-900 mb-2">Playbooks</h1>
              <p className="text-slate-600">Manage campaign sequence templates</p>
            </div>
            {playbooks.length === 0 && (
              <button
                onClick={createSeedPlaybook}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Create Sample Playbook
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left Panel - Playbook List */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Playbooks</h2>
                <button
                  onClick={openAddPlaybook}
                  className="flex items-center px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {playbooks.map((playbook) => (
                  <div
                    key={playbook.id}
                    onClick={() => setSelectedPlaybook(playbook)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlaybook?.id === playbook.id
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-slate-900 text-sm">{playbook.name}</h3>
                      <StatusBadge status={playbook.is_active ? 'active' : 'inactive'} />
                    </div>
                    
                    <p className="text-xs text-slate-600 mb-3">
                      {playbook.verticals?.name || 'Cross-Vertical'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {playbook.total_duration} days
                      </div>
                      <div className="flex items-center">
                        <Target className="w-3 h-3 mr-1" />
                        {playbook.step_count} steps
                      </div>
                    </div>
                  </div>
                ))}

                {playbooks.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <p>No playbooks found.</p>
                    <p className="text-sm mt-2">Create your first playbook to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Playbook Detail */}
          <div className="col-span-2">
            {selectedPlaybook ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={selectedPlaybook.name}
                        onChange={(e) => handleUpdatePlaybookField('name', e.target.value)}
                        className="text-xl font-semibold text-slate-900 bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
                        onBlur={(e) => handleUpdatePlaybookField('name', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={selectedPlaybook.is_active}
                          onChange={(e) => handleUpdatePlaybookField('is_active', e.target.checked)}
                          className="mr-2"
                        />
                        Active
                      </label>
                    </div>
                  </div>

                  <textarea
                    value={selectedPlaybook.description || ''}
                    onChange={(e) => handleUpdatePlaybookField('description', e.target.value)}
                    placeholder="Add a description..."
                    className="w-full text-slate-600 bg-transparent border-none p-0 focus:outline-none focus:ring-0 resize-none"
                    rows={2}
                    onBlur={(e) => handleUpdatePlaybookField('description', e.target.value)}
                  />

                  <div className="flex items-center space-x-6 mt-4 text-sm">
                    <div>
                      <label className="text-slate-500">Vertical:</label>
                      <select
                        value={selectedPlaybook.vertical_id || ''}
                        onChange={(e) => handleUpdatePlaybookField('vertical_id', e.target.value || null)}
                        className="ml-2 bg-transparent border-none focus:outline-none focus:ring-0"
                      >
                        <option value="">Cross-Vertical</option>
                        {verticals.map((vertical) => (
                          <option key={vertical.id} value={vertical.id}>
                            {vertical.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center text-slate-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {selectedPlaybook.total_duration} days total
                    </div>
                  </div>
                </div>

                {/* Steps Timeline */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Steps Timeline</h3>
                    <button
                      onClick={openAddStep}
                      className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </button>
                  </div>

                  {sortedSteps.length > 0 ? (
                    <div className="space-y-4">
                      {sortedSteps.map((step, index) => {
                        const ChannelIcon = channelIcons[step.channel as keyof typeof channelIcons]
                        
                        return (
                          <div key={step.id} className="flex items-start space-x-4">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-cyan-700">
                                  {step.step_number}
                                </span>
                              </div>
                              {index < sortedSteps.length - 1 && (
                                <div className="w-px h-12 bg-slate-200 mt-2"></div>
                              )}
                            </div>

                            {/* Step content */}
                            <div className="flex-1 bg-slate-50 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-slate-900">
                                      Day {step.day_offset}
                                    </span>
                                    <ChannelIcon className="w-4 h-4 text-slate-600" />
                                  </div>
                                  <h4 className="font-medium text-slate-900">{step.title}</h4>
                                  {step.asset_type_required && step.asset_type_required !== 'none' && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                      {step.asset_type_required.replace('_', ' ')}
                                    </span>
                                  )}
                                  {step.is_pivot_trigger && (
                                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                      Pivot Trigger
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => openEditStep(step)}
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStep(step)}
                                    className="p-1 text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              {step.description && (
                                <p className="text-sm text-slate-600">{step.description}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>No steps defined yet.</p>
                      <p className="text-sm mt-2">Add your first step to build the sequence.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-slate-500">
                  <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg">Select a playbook to view details</p>
                  <p className="text-sm mt-2">Choose a playbook from the list to see its steps and configuration.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Playbook Modal */}
      <SlideOver
        open={playbookModalOpen}
        onClose={() => setPlaybookModalOpen(false)}
        title={editingPlaybook ? 'Edit Playbook' : 'New Playbook'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Playbook Name *
            </label>
            <input
              type="text"
              value={playbookFormData.name || ''}
              onChange={(e) => setPlaybookFormData({ ...playbookFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={playbookFormData.description || ''}
              onChange={(e) => setPlaybookFormData({ ...playbookFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vertical
            </label>
            <select
              value={playbookFormData.vertical_id || ''}
              onChange={(e) => setPlaybookFormData({ ...playbookFormData, vertical_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Cross-Vertical</option>
              {verticals.map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={playbookFormData.is_active || false}
              onChange={(e) => setPlaybookFormData({ ...playbookFormData, is_active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setPlaybookModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePlaybook}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              {editingPlaybook ? 'Update Playbook' : 'Create Playbook'}
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Add/Edit Step Modal */}
      <SlideOver
        open={stepModalOpen}
        onClose={() => setStepModalOpen(false)}
        title={editingStep ? 'Edit Step' : 'Add Step'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Step Number *
              </label>
              <input
                type="number"
                min="1"
                value={stepFormData.step_number || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, step_number: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Day Offset *
              </label>
              <input
                type="number"
                min="1"
                value={stepFormData.day_offset || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, day_offset: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Channel *
            </label>
            <select
              value={stepFormData.channel || 'email'}
              onChange={(e) => setStepFormData({ ...stepFormData, channel: e.target.value as 'mail' | 'email' | 'linkedin' | 'phone' | 'in_person' | 'other' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="mail">Mail</option>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="phone">Phone</option>
              <option value="in_person">In Person</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={stepFormData.title || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={stepFormData.description || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asset Type Required
            </label>
            <select
              value={stepFormData.asset_type_required || 'none'}
              onChange={(e) => setStepFormData({ ...stepFormData, asset_type_required: e.target.value as 'blueprint' | 'website_audit' | 'market_report' | 'landing_page' | 'breakup_note' | 'proposal' | 'none' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="none">None</option>
              <option value="blueprint">Blueprint</option>
              <option value="website_audit">Website Audit</option>
              <option value="market_report">Market Report</option>
              <option value="landing_page">Landing Page</option>
              <option value="breakup_note">Breakup Note</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_pivot_trigger"
              checked={stepFormData.is_pivot_trigger || false}
              onChange={(e) => setStepFormData({ ...stepFormData, is_pivot_trigger: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_pivot_trigger" className="text-sm font-medium text-slate-700">
              Is Pivot Trigger
            </label>
            <p className="text-xs text-slate-500 ml-2">
              If no response by this step, pivot to next target
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setStepModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStep}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              {editingStep ? 'Update Step' : 'Add Step'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}