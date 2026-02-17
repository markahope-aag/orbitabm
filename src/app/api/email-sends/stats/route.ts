import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

/**
 * Aggregate email engagement stats for the org.
 * Optional query params: campaign_id, days (default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const campaignId = searchParams.get('campaign_id')
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date()
    since.setDate(since.getDate() - days)

    let query = supabase
      .from('email_sends')
      .select('status, open_count, click_count')
      .eq('organization_id', orgId)
      .gte('created_at', since.toISOString())

    if (campaignId) query = query.eq('campaign_id', campaignId)

    const { data } = await query

    if (!data) {
      return NextResponse.json({ data: null, success: true })
    }

    const total = data.length
    const sent = data.filter((d) => !['queued', 'cancelled', 'failed'].includes(d.status)).length
    const delivered = data.filter((d) => ['delivered', 'opened', 'clicked', 'replied'].includes(d.status)).length
    const opened = data.filter((d) => ['opened', 'clicked', 'replied'].includes(d.status)).length
    const clicked = data.filter((d) => ['clicked', 'replied'].includes(d.status)).length
    const replied = data.filter((d) => d.status === 'replied').length
    const bounced = data.filter((d) => d.status === 'bounced').length
    const complained = data.filter((d) => d.status === 'complained').length
    const failed = data.filter((d) => d.status === 'failed').length
    const queued = data.filter((d) => d.status === 'queued').length

    const stats = {
      total,
      sent,
      delivered,
      opened,
      clicked,
      replied,
      bounced,
      complained,
      failed,
      queued,
      open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      click_rate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      bounce_rate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
      reply_rate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      days,
    }

    return NextResponse.json({ data: stats, success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
