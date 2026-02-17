'use client'

import { useState, useEffect } from 'react'
import { EmailStatusBadge } from './EmailStatusBadge'
import type { EmailSendRow } from '@/lib/types/database'

interface EmailSendWithRelations extends EmailSendRow {
  contacts?: { id: string; first_name: string; last_name: string; email: string } | null
  campaigns?: { id: string; name: string } | null
}

interface EmailQueueTableProps {
  campaignId?: string
  status?: string
  limit?: number
  title?: string
  onRowClick?: (send: EmailSendWithRelations) => void
}

export function EmailQueueTable({
  campaignId,
  status,
  limit = 50,
  title = 'Email Queue',
  onRowClick,
}: EmailQueueTableProps) {
  const [sends, setSends] = useState<EmailSendWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (campaignId) params.set('campaign_id', campaignId)
    if (status) params.set('status', status)
    params.set('limit', String(limit))

    fetch(`/api/email-sends?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSends(res.data || [])
      })
      .finally(() => setLoading(false))
  }, [campaignId, status, limit])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Contact</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Subject</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Campaign</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Scheduled</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Opens</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {sends.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-slate-400 py-8">
                  No emails found
                </td>
              </tr>
            ) : (
              sends.map((send) => (
                <tr
                  key={send.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(send)}
                >
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      {send.contacts
                        ? `${send.contacts.first_name} ${send.contacts.last_name}`
                        : send.recipient_email}
                    </div>
                    <div className="text-xs text-slate-400">{send.recipient_email}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-700 max-w-xs truncate">
                      {send.subject_line}
                    </div>
                    {send.subject_line_variant && (
                      <span className="text-xs text-slate-400">Variant {send.subject_line_variant}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600">
                      {send.campaigns?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600">
                      {new Date(send.scheduled_at).toLocaleDateString()}
                    </div>
                    {send.sent_at && (
                      <div className="text-xs text-slate-400">
                        Sent {new Date(send.sent_at).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <EmailStatusBadge status={send.status} />
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-slate-600">
                    {send.open_count || 0}
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-slate-600">
                    {send.click_count || 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
