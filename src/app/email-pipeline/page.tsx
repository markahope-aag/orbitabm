'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmailPipelineChart } from '@/components/email/EmailPipelineChart'
import { EmailPreviewSlideOver } from '@/components/email/EmailPreviewSlideOver'
import { EmailStatusBadge } from '@/components/email/EmailStatusBadge'
import { CalendarClock, Mail, Inbox, Send, Clock } from 'lucide-react'

interface PipelineData {
  dailyVolume: {
    date: string
    dayLabel: string
    sent: number
    queued: number
    total: number
    isToday: boolean
  }[]
  todaySends: EmailSendRow[]
  weekSends: EmailSendRow[]
  summary: {
    today: number
    thisWeek: number
    totalQueued: number
    sent7d: number
  }
}

interface EmailSendRow {
  id: string
  recipient_email: string
  subject_line: string
  status: string
  scheduled_at: string
  sent_at: string | null
  contacts?: { id: string; first_name: string; last_name: string; email: string } | null
  campaigns?: { id: string; name: string } | null
}

export default function EmailPipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [slideOverOpen, setSlideOverOpen] = useState(false)

  useEffect(() => {
    fetch('/api/email-sends/pipeline')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  function handleRowClick(id: string) {
    setSelectedEmailId(id)
    setSlideOverOpen(true)
  }

  const kpiCards = data
    ? [
        { label: 'Today', value: data.summary.today, icon: CalendarClock, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { label: 'This Week', value: data.summary.thisWeek, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Queued', value: data.summary.totalQueued, icon: Inbox, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Sent (7d)', value: data.summary.sent7d, icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ]
    : []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Email Pipeline"
        description="See what's scheduled and what's been sent"
      />

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
              <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">{card.label}</span>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Bar Chart */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8 animate-pulse">
          <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-6 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="mb-8">
          <EmailPipelineChart dailyVolume={data.dailyVolume} />
        </div>
      ) : null}

      {/* Today's Sends Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Today&apos;s Sends</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Subject</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Campaign</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Scheduled Time</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.todaySends.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-slate-400 py-8">
                      No emails scheduled for today
                    </td>
                  </tr>
                ) : (
                  data.todaySends.map((send) => (
                    <tr
                      key={send.id}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleRowClick(send.id)}
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
                        <div className="text-sm text-slate-700 max-w-xs truncate">{send.subject_line}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-slate-600">{send.campaigns?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-slate-600">
                          {new Date(send.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <EmailStatusBadge status={send.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* This Week Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">This Week</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Subject</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Campaign</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Day</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.weekSends.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-slate-400 py-8">
                      No emails scheduled this week
                    </td>
                  </tr>
                ) : (
                  data.weekSends.map((send) => (
                    <tr
                      key={send.id}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleRowClick(send.id)}
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
                        <div className="text-sm text-slate-700 max-w-xs truncate">{send.subject_line}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-slate-600">{send.campaigns?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-slate-600">
                          {new Date(send.scheduled_at).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <EmailStatusBadge status={send.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <EmailPreviewSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        emailSendId={selectedEmailId}
      />
    </div>
  )
}
