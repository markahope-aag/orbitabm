import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createEmailTemplateSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const playbookStepId = searchParams.get('playbook_step_id')
    const campaignId = searchParams.get('campaign_id')
    const targetContactRole = searchParams.get('target_contact_role')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('email_templates')
      .select(`
        *,
        playbook_steps:playbook_step_id(title, step_number, playbook_template_id)
      `)
      .eq('organization_id', organizationId)
      .range(offset, offset + limit - 1)

    if (playbookStepId) query = query.eq('playbook_step_id', playbookStepId)
    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (targetContactRole) query = query.eq('target_contact_role', targetContactRole)

    const { data, error, count } = await query.order('name')

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      count,
      error: null
    })

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(createEmailTemplateSchema, body)
    if (!validation.success) return validation.response

    const { data, error } = await supabase
      .from('email_templates')
      .insert([validation.data])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    logCreate({ supabase, request }, 'email_template', data)

    return NextResponse.json({
      data,
      error: null
    })

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
