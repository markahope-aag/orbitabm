import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

/**
 * Pipeline data: 7-day window (3 days back, 3 days forward) of email sends
 * grouped by day, plus today's and this week's sends with joins.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 7-day window: 3 days back, 3 days forward
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 3)
    const windowEnd = new Date(today)
    windowEnd.setDate(windowEnd.getDate() + 4) // exclusive end (3 days forward + end of day 3)

    // Monday of current week
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() + mondayOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 5) // Saturday 00:00 (exclusive)

    const todayEnd = new Date(today)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // 7d ago for sent count
    const sent7dAgo = new Date(today)
    sent7dAgo.setDate(sent7dAgo.getDate() - 7)

    // Fetch all sends in the 7-day window for daily volume
    const { data: windowSends } = await supabase
      .from('email_sends')
      .select('id, status, scheduled_at')
      .eq('organization_id', orgId)
      .gte('scheduled_at', windowStart.toISOString())
      .lt('scheduled_at', windowEnd.toISOString())

    // Build daily volume
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dailyVolume: { date: string; dayLabel: string; sent: number; queued: number; total: number; isToday: boolean }[] = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(windowStart)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const nextD = new Date(d)
      nextD.setDate(nextD.getDate() + 1)

      const daySends = (windowSends || []).filter((s) => {
        const sa = new Date(s.scheduled_at)
        return sa >= d && sa < nextD
      })

      const sent = daySends.filter((s) => !['queued', 'cancelled', 'failed'].includes(s.status)).length
      const queued = daySends.filter((s) => s.status === 'queued').length
      const month = d.getMonth() + 1
      const day = d.getDate()

      dailyVolume.push({
        date: dateStr,
        dayLabel: `${dayNames[d.getDay()]} ${month}/${day}`,
        sent,
        queued,
        total: sent + queued,
        isToday: dateStr === today.toISOString().split('T')[0],
      })
    }

    // Today's sends with joins
    const { data: todaySends } = await supabase
      .from('email_sends')
      .select(`
        id, recipient_email, subject_line, status, scheduled_at, sent_at,
        contacts (id, first_name, last_name, email),
        campaigns (id, name)
      `)
      .eq('organization_id', orgId)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: true })

    // This week's sends with joins
    const { data: weekSends } = await supabase
      .from('email_sends')
      .select(`
        id, recipient_email, subject_line, status, scheduled_at, sent_at,
        contacts (id, first_name, last_name, email),
        campaigns (id, name)
      `)
      .eq('organization_id', orgId)
      .gte('scheduled_at', weekStart.toISOString())
      .lt('scheduled_at', weekEnd.toISOString())
      .order('scheduled_at', { ascending: true })

    // Summary counts
    const todayCount = (todaySends || []).length
    const weekCount = (weekSends || []).length

    // Total queued (all time)
    const { count: totalQueued } = await supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'queued')

    // Sent in last 7 days
    const { count: sent7d } = await supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .not('status', 'in', '("queued","cancelled","failed")')
      .gte('scheduled_at', sent7dAgo.toISOString())

    return NextResponse.json({
      data: {
        dailyVolume,
        todaySends: todaySends || [],
        weekSends: weekSends || [],
        summary: {
          today: todayCount,
          thisWeek: weekCount,
          totalQueued: totalQueued || 0,
          sent7d: sent7d || 0,
        },
      },
      success: true,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
