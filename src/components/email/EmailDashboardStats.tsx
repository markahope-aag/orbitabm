'use client'

import { useState, useEffect } from 'react'
import { Mail, Eye, MousePointerClick, AlertTriangle } from 'lucide-react'

interface EmailStats {
  total: number
  sent: number
  opened: number
  clicked: number
  bounced: number
  queued: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  reply_rate: number
  days: number
}

export function EmailDashboardStats() {
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/email-sends/stats?days=30')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
            <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      label: 'Sent (30d)',
      value: stats.sent,
      subtext: `${stats.queued} queued`,
      icon: Mail,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Open Rate',
      value: `${stats.open_rate}%`,
      subtext: `${stats.opened} opened`,
      icon: Eye,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Click Rate',
      value: `${stats.click_rate}%`,
      subtext: `${stats.clicked} clicked`,
      icon: MousePointerClick,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Bounce Rate',
      value: `${stats.bounce_rate}%`,
      subtext: `${stats.bounced} bounced`,
      icon: AlertTriangle,
      color: stats.bounce_rate > 5 ? 'text-red-600' : 'text-amber-600',
      bg: stats.bounce_rate > 5 ? 'bg-red-50' : 'bg-amber-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
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
            <div className="text-xs text-slate-400 mt-1">{card.subtext}</div>
          </div>
        )
      })}
    </div>
  )
}
