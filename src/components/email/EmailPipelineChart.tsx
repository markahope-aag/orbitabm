'use client'

interface DayVolume {
  date: string
  dayLabel: string
  sent: number
  queued: number
  total: number
  isToday: boolean
}

interface EmailPipelineChartProps {
  dailyVolume: DayVolume[]
}

export function EmailPipelineChart({ dailyVolume }: EmailPipelineChartProps) {
  const maxTotal = Math.max(...dailyVolume.map((d) => d.total), 1)

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Send Volume (7 days)</h3>
      <div className="space-y-3">
        {dailyVolume.map((day) => {
          const sentPct = (day.sent / maxTotal) * 100
          const queuedPct = (day.queued / maxTotal) * 100
          const today = new Date()
          const dayDate = new Date(day.date + 'T00:00:00')
          const isFuture = dayDate > today

          return (
            <div
              key={day.date}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                day.isToday ? 'bg-cyan-50' : ''
              }`}
            >
              <div className="w-24 text-sm text-slate-600 font-medium shrink-0">
                {day.dayLabel}
                {day.isToday && (
                  <span className="ml-1 text-xs text-cyan-600 font-semibold">(today)</span>
                )}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden flex">
                  {day.sent > 0 && (
                    <div
                      className={`h-full ${isFuture ? 'bg-cyan-200' : 'bg-cyan-500'} transition-all`}
                      style={{ width: `${sentPct}%` }}
                    />
                  )}
                  {day.queued > 0 && (
                    <div
                      className={`h-full ${isFuture ? 'bg-slate-200' : 'bg-slate-300'} transition-all`}
                      style={{ width: `${queuedPct}%` }}
                    />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700 w-8 text-right shrink-0">
                  {day.total}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          Sent
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          Queued
        </div>
      </div>
    </div>
  )
}
