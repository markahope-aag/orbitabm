'use client'

import { X } from 'lucide-react'
import type { CompanyRow, ContactRow, CampaignRow } from '@/lib/types/database'
import { resolveMergeFields } from '@/lib/sequence/merge-fields'

interface EmailPreviewModalProps {
  open: boolean
  onClose: () => void
  subjectLine: string
  body: string
  company: CompanyRow | null
  contact: ContactRow | null
  campaign: CampaignRow | null
}

export function EmailPreviewModal({
  open,
  onClose,
  subjectLine,
  body,
  company,
  contact,
  campaign,
}: EmailPreviewModalProps) {
  if (!open) return null

  const subjectResult = resolveMergeFields(subjectLine, company, contact, campaign)
  const bodyResult = resolveMergeFields(body, company, contact, campaign)
  const allUnresolved = [...new Set([...subjectResult.unresolved, ...bodyResult.unresolved])]

  // Highlight unresolved tokens in red
  function highlightUnresolved(text: string, unresolvedTokens: string[]): React.ReactNode[] {
    if (unresolvedTokens.length === 0) return [text]

    const parts: React.ReactNode[] = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
      let earliestIdx = remaining.length
      let earliestToken = ''

      for (const token of unresolvedTokens) {
        const idx = remaining.indexOf(token)
        if (idx !== -1 && idx < earliestIdx) {
          earliestIdx = idx
          earliestToken = token
        }
      }

      if (earliestToken === '') {
        parts.push(remaining)
        break
      }

      if (earliestIdx > 0) {
        parts.push(remaining.slice(0, earliestIdx))
      }
      parts.push(
        <span key={key++} className="bg-red-100 text-red-700 px-1 rounded font-mono text-sm">
          {earliestToken}
        </span>
      )
      remaining = remaining.slice(earliestIdx + earliestToken.length)
    }

    return parts
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Email Preview</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Unresolved warning */}
            {allUnresolved.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700 font-medium">
                  {allUnresolved.length} unresolved merge field{allUnresolved.length > 1 ? 's' : ''}:
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {allUnresolved.map((t) => (
                    <span key={t} className="text-xs font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
              <div className="mt-1 text-base font-medium text-slate-900">
                {highlightUnresolved(subjectResult.resolved, subjectResult.unresolved)}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-slate-200" />

            {/* Body */}
            <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
              {highlightUnresolved(bodyResult.resolved, bodyResult.unresolved)}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
