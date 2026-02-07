'use client'

import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight, Mail, Linkedin, Eye, Sparkles, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { StatusBadge, Badge } from '@/components/ui'
import type { EmailDraft, ContactOption, ActivityWithStep } from '@/lib/sequence/types'

interface EmailTimelineCardProps {
  activity: ActivityWithStep
  draft: EmailDraft
  contacts: ContactOption[]
  onDraftChange: (draft: EmailDraft) => void
  onDraftBlur: () => void
  onPreview: () => void
  onInsertMergeField: (token: string) => void
}

export function EmailTimelineCard({
  activity,
  draft,
  contacts,
  onDraftChange,
  onDraftBlur,
  onPreview,
  onInsertMergeField,
}: EmailTimelineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [bodyMode, setBodyMode] = useState<'edit' | 'preview'>('edit')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)

  const isEmail = activity.channel === 'email'
  const ChannelIcon = isEmail ? MessageSquare : Linkedin
  const channelLabel = isEmail ? 'Email' : 'LinkedIn'
  const dayOffset = activity.playbook_steps?.day_offset ?? 0

  const targetContact = contacts.find((c) => c.id === draft.targetContactId)

  const statusFromDraft = (): string => {
    if (activity.status === 'completed') return 'sent'
    if (draft.subjectLine && draft.body) return 'ready'
    return 'draft'
  }

  // Insert merge field at cursor in the active text area
  const handleInsertField = (token: string) => {
    onInsertMergeField(token)

    // Try to insert at cursor in the body textarea
    const el = bodyRef.current
    if (el && document.activeElement === el) {
      const start = el.selectionStart
      const end = el.selectionEnd
      const newBody = draft.body.slice(0, start) + token + draft.body.slice(end)
      onDraftChange({ ...draft, body: newBody })
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + token.length
        el.focus()
      })
      return
    }

    // Fallback: append to body
    onDraftChange({ ...draft, body: draft.body + token })
  }

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500'

  return (
    <div className="flex items-start space-x-4">
      {/* Timeline node */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
          <ChannelIcon className="w-5 h-5 text-slate-500" />
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-2 min-h-[16px]" />
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 mb-4">
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 text-left"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <span className="flex-shrink-0 text-xs font-bold text-white bg-slate-600 rounded px-2 py-0.5">
              Day {dayOffset}
            </span>
            <Badge
              label={channelLabel}
              color={isEmail ? 'blue' : 'purple'}
            />
            {targetContact && (
              <span className="text-sm text-slate-600 truncate">
                {targetContact.first_name} {targetContact.last_name}
                {targetContact.dmu_role && (
                  <span className="text-slate-400 ml-1">
                    ({targetContact.dmu_role.replace(/_/g, ' ')})
                  </span>
                )}
              </span>
            )}
            <span className="text-sm truncate" style={{ color: draft.subjectLine ? undefined : '#94a3b8' }}>
              {draft.subjectLine || 'No subject yet'}
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
            <StatusBadge status={statusFromDraft()} />
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* Expanded body */}
        {expanded && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
            {/* Subject line */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject Line</label>
              <input
                ref={subjectRef}
                type="text"
                value={draft.subjectLine}
                onChange={(e) => onDraftChange({ ...draft, subjectLine: e.target.value })}
                onBlur={onDraftBlur}
                placeholder="Email subject line..."
                className={inputClass}
              />
            </div>

            {/* Alt subject */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">A/B Alternative</label>
              <input
                type="text"
                value={draft.subjectLineAlt}
                onChange={(e) => onDraftChange({ ...draft, subjectLineAlt: e.target.value })}
                onBlur={onDraftBlur}
                placeholder="Alternative subject line for A/B testing..."
                className={inputClass}
              />
            </div>

            {/* Body editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700">Body</label>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setBodyMode('edit')}
                    className={`px-2 py-0.5 text-xs rounded ${bodyMode === 'edit' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setBodyMode('preview')}
                    className={`px-2 py-0.5 text-xs rounded ${bodyMode === 'preview' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              {bodyMode === 'edit' ? (
                <textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
                  onBlur={onDraftBlur}
                  rows={10}
                  placeholder="Write email body... Use {{merge.fields}} for personalization."
                  className={`${inputClass} font-mono resize-y`}
                />
              ) : (
                <div className="border border-slate-200 rounded-md p-4 min-h-[200px] prose prose-sm prose-slate max-w-none">
                  {draft.body ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.body}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-400 italic">No content yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Target contact */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Contact</label>
              <div className="flex items-center space-x-2">
                <select
                  value={draft.targetContactId || ''}
                  onChange={(e) => {
                    onDraftChange({ ...draft, targetContactId: e.target.value || null })
                    // save on change for selects
                    setTimeout(onDraftBlur, 0)
                  }}
                  className={inputClass}
                >
                  <option value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} — {c.title || 'No title'}
                    </option>
                  ))}
                </select>
                {targetContact?.dmu_role && (
                  <Badge label={targetContact.dmu_role.replace(/_/g, ' ')} color="blue" />
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
                onBlur={onDraftBlur}
                rows={2}
                placeholder="Sending guidance, timing notes..."
                className={inputClass}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={onPreview}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview
              </button>
              <button
                disabled
                className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-50 rounded cursor-not-allowed"
                title="Coming in Phase 2"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Generate with AI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
