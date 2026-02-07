'use client'

import { RefreshCw, Sparkles } from 'lucide-react'

interface SectionBlockProps {
  title: string
  type: 'auto' | 'manual' | 'hybrid' | 'calculated'
  source?: 'auto_generated' | 'human_edited'
  hasContent?: boolean
  onRefresh?: () => void
  children: React.ReactNode
}

function getStatusDot(type: string, source?: string, hasContent?: boolean): { color: string; label: string } {
  if (type === 'auto' || type === 'calculated') return { color: 'bg-blue-500', label: 'Auto' }
  if (type === 'hybrid') {
    if (source === 'human_edited') return { color: 'bg-emerald-500', label: 'Edited' }
    return { color: 'bg-blue-500', label: 'Auto' }
  }
  // manual
  if (source === 'human_edited') return { color: 'bg-emerald-500', label: 'Edited' }
  if (hasContent) return { color: 'bg-amber-500', label: 'Draft' }
  return { color: 'bg-slate-300', label: 'Empty' }
}

export function SectionBlock({ title, type, source, hasContent, onRefresh, children }: SectionBlockProps) {
  const status = getStatusDot(type, source, hasContent)

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <span className="flex items-center text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${status.color} mr-1.5`} />
            {status.label}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {(type === 'auto' || type === 'hybrid') && onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh from DB
            </button>
          )}
          {type === 'manual' && (
            <button
              disabled
              className="flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 rounded cursor-not-allowed"
              title="Coming soon"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Generate with AI
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">{children}</div>
    </div>
  )
}
