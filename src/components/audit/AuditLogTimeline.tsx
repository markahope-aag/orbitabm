'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'
import { Badge } from '@/components/ui/Badge'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { AuditLogRow } from '@/lib/types/database'

interface AuditLogTimelineProps {
  entityType?: string
  entityId?: string
  action?: string
  showEntityColumn?: boolean
  limit?: number
}

const ACTION_CONFIG = {
  create: { color: 'green' as const, icon: Plus, label: 'Created' },
  update: { color: 'yellow' as const, icon: Pencil, label: 'Updated' },
  delete: { color: 'red' as const, icon: Trash2, label: 'Deleted' },
}

function formatEntityType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

function DiffView({ oldValues, newValues, changedFields }: {
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  changedFields: string[] | null
}) {
  if (!changedFields || changedFields.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {changedFields.map(field => (
        <div key={field} className="text-xs font-mono">
          <span className="text-slate-500">{field}:</span>
          {oldValues?.[field] !== undefined && (
            <span className="ml-2 text-red-600 line-through">
              {JSON.stringify(oldValues[field])}
            </span>
          )}
          {newValues?.[field] !== undefined && (
            <span className="ml-2 text-emerald-600">
              {JSON.stringify(newValues[field])}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function AuditLogTimeline({
  entityType,
  entityId,
  action,
  showEntityColumn = false,
  limit = 50,
}: AuditLogTimelineProps) {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!orgId) return

    async function fetchLogs() {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (entityType) query = query.eq('entity_type', entityType)
      if (entityId) query = query.eq('entity_id', entityId)
      if (action) query = query.eq('action', action)

      const { data } = await query
      setLogs(data ?? [])
      setLoading(false)
    }

    fetchLogs()
  }, [orgId, entityType, entityId, action, limit])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading audit trail...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        No audit log entries found.
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {logs.map((log, idx) => {
        const config = ACTION_CONFIG[log.action]
        const Icon = config.icon
        const isExpanded = expandedIds.has(log.id)
        const hasChanges = log.action === 'update' && log.changed_fields && log.changed_fields.length > 0

        return (
          <div key={log.id} className="relative flex gap-4">
            {/* Timeline line */}
            {idx < logs.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />
            )}

            {/* Icon */}
            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              config.color === 'green' ? 'bg-emerald-100 text-emerald-600' :
              config.color === 'yellow' ? 'bg-amber-100 text-amber-600' :
              'bg-red-100 text-red-600'
            }`}>
              <Icon size={14} />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={config.label} color={config.color} />
                  {showEntityColumn && (
                    <span className="text-sm font-medium text-slate-700">
                      {formatEntityType(log.entity_type)}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {log.user_email ?? 'System'}
                  </span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2" title={new Date(log.created_at).toLocaleString()}>
                  {timeAgo(log.created_at)}
                </span>
              </div>

              {/* Expandable changes */}
              {hasChanges && (
                <button
                  onClick={() => toggleExpanded(log.id)}
                  className="mt-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {log.changed_fields!.length} field{log.changed_fields!.length > 1 ? 's' : ''} changed
                </button>
              )}

              {isExpanded && (
                <DiffView
                  oldValues={log.old_values}
                  newValues={log.new_values}
                  changedFields={log.changed_fields}
                />
              )}

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-1 text-xs text-slate-400">
                  {Object.entries(log.metadata).map(([k, v]) => (
                    <span key={k} className="mr-3">{k}: {String(v)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
