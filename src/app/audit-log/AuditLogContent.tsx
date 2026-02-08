'use client'

import { useState } from 'react'
import { AuditLogTimeline } from '@/components/audit/AuditLogTimeline'
import type { AuditAction, AuditEntityType } from '@/lib/types/database'

const ENTITY_TYPES: AuditEntityType[] = [
  'organization', 'market', 'vertical', 'company', 'contact',
  'campaign', 'activity', 'asset', 'result',
  'playbook_template', 'playbook_step', 'digital_snapshot',
  'email_template', 'document_template', 'generated_document',
]

const ACTIONS: AuditAction[] = ['create', 'update', 'delete']

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function AuditLogContent() {
  const [entityType, setEntityType] = useState<string>('')
  const [action, setAction] = useState<string>('')

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="">All entities</option>
              {ENTITY_TYPES.map(t => (
                <option key={t} value={t}>{formatLabel(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="">All actions</option>
              {ACTIONS.map(a => (
                <option key={a} value={a}>{formatLabel(a)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <AuditLogTimeline
          entityType={entityType || undefined}
          action={action || undefined}
          showEntityColumn={true}
          limit={100}
          key={`${entityType}-${action}`}
        />
      </div>
    </div>
  )
}
