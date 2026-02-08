import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createGeneratedDocumentSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = await resolveUserOrgId(supabase)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documentType = searchParams.get('document_type')
    const status = searchParams.get('status')
    const companyId = searchParams.get('company_id')
    const campaignId = searchParams.get('campaign_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('generated_documents')
      .select(`
        *,
        document_templates:document_template_id(name),
        companies:company_id(name),
        campaigns:campaign_id(name),
        profiles:approved_by(full_name)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)

    if (documentType) query = query.eq('document_type', documentType)
    if (status) query = query.eq('status', status)
    if (companyId) query = query.eq('company_id', companyId)
    if (campaignId) query = query.eq('campaign_id', campaignId)

    const { data, error, count } = await query.order('created_at', { ascending: false })

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
    const validation = validateRequest(createGeneratedDocumentSchema, body)
    if (!validation.success) return validation.response

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('generated_documents')
      .insert([{ ...validation.data, organization_id: userOrgId }])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    await logCreate({ supabase, request }, 'generated_document', data)

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
