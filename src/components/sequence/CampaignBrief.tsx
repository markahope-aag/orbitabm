'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { CampaignWithRelations, ContactOption } from '@/lib/sequence/types'

interface CampaignBriefProps {
  campaign: CampaignWithRelations
  contacts: ContactOption[]
  primaryContactId: string | null
  secondaryContactId: string | null
  onFieldBlur: (field: string, value: string | null) => void
}

export function CampaignBrief({
  campaign,
  contacts,
  primaryContactId,
  secondaryContactId,
  onFieldBlur,
}: CampaignBriefProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [valueProposition, setValueProposition] = useState(campaign.value_proposition || '')
  const [primaryWedge, setPrimaryWedge] = useState(campaign.primary_wedge || '')
  const [backupTrigger, setBackupTrigger] = useState(campaign.backup_trigger || '')
  const [successCriteria, setSuccessCriteria] = useState(campaign.success_criteria || '')
  const [localPrimaryContact, setLocalPrimaryContact] = useState(primaryContactId || '')
  const [localSecondaryContact, setLocalSecondaryContact] = useState(secondaryContactId || '')

  const primaryContact = contacts.find((c) => c.id === localPrimaryContact)
  const secondaryContact = contacts.find((c) => c.id === localSecondaryContact)

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-semibold text-slate-900">Campaign Brief</h2>
        {collapsed ? (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-6 pb-6 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4">
            {/* Target Account — read only */}
            <div>
              <label className={labelClass}>Target Account</label>
              <div className="flex items-center space-x-2 py-2">
                <a
                  href={`/companies/${campaign.company_id}`}
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                >
                  {campaign.companies?.name || 'Unknown'}
                </a>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            {/* Value Proposition */}
            <div>
              <label className={labelClass}>Value Proposition</label>
              <input
                type="text"
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
                onBlur={() => onFieldBlur('value_proposition', valueProposition || null)}
                placeholder="One sentence: what we're offering and why"
                className={inputClass}
              />
            </div>

            {/* Primary Wedge */}
            <div>
              <label className={labelClass}>Primary Wedge</label>
              <input
                type="text"
                value={primaryWedge}
                onChange={(e) => setPrimaryWedge(e.target.value)}
                onBlur={() => onFieldBlur('primary_wedge', primaryWedge || null)}
                placeholder="The specific tension/gap this campaign exploits"
                className={inputClass}
              />
            </div>

            {/* Primary Contact */}
            <div>
              <label className={labelClass}>Primary Contact</label>
              <div className="flex items-center space-x-2">
                <select
                  value={localPrimaryContact}
                  onChange={(e) => {
                    setLocalPrimaryContact(e.target.value)
                    onFieldBlur('primary_contact_id', e.target.value || null)
                  }}
                  className={inputClass}
                >
                  <option value="">Select a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} — {c.title || 'No title'}
                    </option>
                  ))}
                </select>
                {primaryContact?.dmu_role && (
                  <Badge
                    label={primaryContact.dmu_role.replace(/_/g, ' ')}
                    color="blue"
                  />
                )}
              </div>
            </div>

            {/* Secondary Contact */}
            <div>
              <label className={labelClass}>Secondary Contact</label>
              <div className="flex items-center space-x-2">
                <select
                  value={localSecondaryContact}
                  onChange={(e) => {
                    setLocalSecondaryContact(e.target.value)
                    onFieldBlur('secondary_contact_id', e.target.value || null)
                  }}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} — {c.title || 'No title'}
                    </option>
                  ))}
                </select>
                {secondaryContact?.dmu_role && (
                  <Badge
                    label={secondaryContact.dmu_role.replace(/_/g, ' ')}
                    color="gray"
                  />
                )}
              </div>
            </div>

            {/* Backup Trigger */}
            <div>
              <label className={labelClass}>Backup Trigger</label>
              <input
                type="text"
                value={backupTrigger}
                onChange={(e) => setBackupTrigger(e.target.value)}
                onBlur={() => onFieldBlur('backup_trigger', backupTrigger || null)}
                placeholder="What event re-triggers engagement after sequence ends?"
                className={inputClass}
              />
            </div>

            {/* Success Criteria */}
            <div className="col-span-2">
              <label className={labelClass}>Success Criteria</label>
              <input
                type="text"
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
                onBlur={() => onFieldBlur('success_criteria', successCriteria || null)}
                placeholder="What counts as a win?"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
