'use client'

import { useState, useEffect } from 'react'
import { SlideOver } from '@/components/ui/SlideOver'
import { EmailStatusBadge } from './EmailStatusBadge'
import { Eye, MousePointerClick, Clock, AlertCircle } from 'lucide-react'

interface EmailSendDetail {
  id: string
  recipient_email: string
  from_email: string
  subject_line: string
  subject_line_variant: 'A' | 'B' | null
  body_html: string | null
  body_plain: string | null
  status: string
  open_count: number
  click_count: number
  first_opened_at: string | null
  last_opened_at: string | null
  first_clicked_at: string | null
  clicked_links: string[] | null
  bounced_at: string | null
  bounce_type: string | null
  complained_at: string | null
  scheduled_at: string
  sent_at: string | null
  error_message: string | null
  contacts?: { first_name: string; last_name: string; email: string; title: string | null; companies?: { name: string } | null } | null
  campaigns?: { name: string; status: string } | null
}

interface EmailPreviewSlideOverProps {
  open: boolean
  onClose: () => void
  emailSendId: string | null
}

export function EmailPreviewSlideOver({ open, onClose, emailSendId }: EmailPreviewSlideOverProps) {
  const [data, setData] = useState<EmailSendDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!emailSendId || !open) return
    setLoading(true)
    fetch(`/api/email-sends/${emailSendId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .finally(() => setLoading(false))
  }, [emailSendId, open])

  return (
    <SlideOver open={open} onClose={onClose} title="Email Details">
      {loading && <p className="text-slate-400">Loading...</p>}

      {data && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <EmailStatusBadge status={data.status} />
              {data.subject_line_variant && (
                <span className="text-xs text-slate-400">Subject {data.subject_line_variant}</span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{data.subject_line}</h3>
            <div className="text-sm text-slate-500 mt-1">
              To: {data.contacts
                ? `${data.contacts.first_name} ${data.contacts.last_name} <${data.recipient_email}>`
                : data.recipient_email}
            </div>
            {data.contacts?.title && (
              <div className="text-xs text-slate-400">
                {data.contacts.title}{data.contacts.companies ? ` at ${data.contacts.companies.name}` : ''}
              </div>
            )}
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Eye className="w-4 h-4" />
                Opens
              </div>
              <div className="text-xl font-bold text-slate-900">{data.open_count}</div>
              {data.first_opened_at && (
                <div className="text-xs text-slate-400">
                  First: {new Date(data.first_opened_at).toLocaleString()}
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <MousePointerClick className="w-4 h-4" />
                Clicks
              </div>
              <div className="text-xl font-bold text-slate-900">{data.click_count}</div>
              {data.first_clicked_at && (
                <div className="text-xs text-slate-400">
                  First: {new Date(data.first_clicked_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Clicked Links */}
          {data.clicked_links && data.clicked_links.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Clicked Links</h4>
              <div className="space-y-1">
                {data.clicked_links.map((link, i) => (
                  <div key={i} className="text-xs text-blue-600 truncate">{link}</div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Timeline</h4>
            <div className="space-y-2">
              <TimelineItem
                icon={Clock}
                label="Scheduled"
                time={data.scheduled_at}
              />
              {data.sent_at && (
                <TimelineItem icon={Clock} label="Sent" time={data.sent_at} />
              )}
              {data.first_opened_at && (
                <TimelineItem icon={Eye} label="First opened" time={data.first_opened_at} />
              )}
              {data.first_clicked_at && (
                <TimelineItem icon={MousePointerClick} label="First clicked" time={data.first_clicked_at} />
              )}
              {data.bounced_at && (
                <TimelineItem icon={AlertCircle} label={`Bounced (${data.bounce_type})`} time={data.bounced_at} color="text-red-500" />
              )}
              {data.complained_at && (
                <TimelineItem icon={AlertCircle} label="Spam complaint" time={data.complained_at} color="text-red-500" />
              )}
              {data.error_message && (
                <div className="text-xs text-red-500 bg-red-50 rounded p-2">
                  Error: {data.error_message}
                </div>
              )}
            </div>
          </div>

          {/* Email Preview */}
          {data.body_html && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Email Preview</h4>
              <div
                className="border border-slate-200 rounded-lg p-4 bg-white text-sm max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: data.body_html }}
              />
            </div>
          )}
        </div>
      )}
    </SlideOver>
  )
}

function TimelineItem({
  icon: Icon,
  label,
  time,
  color = 'text-slate-500',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  time: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={color}>{label}</span>
      <span className="text-slate-400">{new Date(time).toLocaleString()}</span>
    </div>
  )
}
