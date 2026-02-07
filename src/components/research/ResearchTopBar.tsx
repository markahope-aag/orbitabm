'use client'

import { ArrowLeft, Download, Printer, CheckCircle } from 'lucide-react'
import { StatusBadge } from '@/components/ui'
import { getScoreBgColor } from '@/lib/research/scoring'
import type { DocumentStatus } from '@/lib/types/database'

interface ResearchTopBarProps {
  companyId: string
  title: string
  onTitleChange: (title: string) => void
  status: DocumentStatus
  onStatusChange: (status: DocumentStatus) => void
  readinessScore: number
  version: number
  lastSavedAt: string | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onExportMd: () => void
  onExportPdf: () => void
  onApprove: () => void
}

const STATUS_FLOW: Record<string, DocumentStatus> = {
  draft: 'in_review',
  in_review: 'approved',
}

export function ResearchTopBar({
  companyId,
  title,
  onTitleChange,
  status,
  onStatusChange,
  readinessScore,
  version,
  lastSavedAt,
  saveStatus,
  onExportMd,
  onExportPdf,
  onApprove,
}: ResearchTopBarProps) {
  const nextStatus = STATUS_FLOW[status]

  const saveLabel = (() => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return lastSavedAt ? `Saved at ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'
      case 'error':
        return 'Save failed'
      default:
        return ''
    }
  })()

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top row: back link */}
        <div className="flex items-center mb-3">
          <a
            href={`/companies/${companyId}`}
            className="flex items-center text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Company
          </a>
        </div>

        {/* Main row */}
        <div className="flex items-center justify-between">
          {/* Left: title + status */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-xl font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 truncate flex-1 min-w-0"
            />
            <button
              onClick={() => nextStatus && onStatusChange(nextStatus)}
              disabled={!nextStatus}
              className="flex-shrink-0"
            >
              <StatusBadge status={status} />
            </button>
            <span className={`flex-shrink-0 text-sm font-semibold px-2 py-0.5 rounded ${getScoreBgColor(readinessScore)}`}>
              {readinessScore}/10
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center space-x-3 ml-4">
            {/* Save status */}
            <span className={`text-xs ${saveStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
              {saveLabel}
            </span>
            <span className="text-xs text-slate-300">v{version}</span>

            <button
              onClick={onExportMd}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export MD
            </button>
            <button
              onClick={onExportPdf}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Export PDF
            </button>
            {status !== 'approved' && (
              <button
                onClick={onApprove}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Approve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
