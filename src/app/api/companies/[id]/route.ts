import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateCompanySchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logUpdate, logDelete } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { extractDomain } from '@/lib/utils/normalize'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        markets (name),
        verticals (name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      )
    }

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || data.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const validation = validateRequest(updateCompanySchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('companies').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If website is being updated, check for domain duplicates
    const updatePayload = { ...validation.data } as Record<string, unknown>
    if ('website' in validation.data) {
      const domain = extractDomain(validation.data.website)
      updatePayload.domain = domain

      if (domain) {
        const { data: existing, error: checkError } = await supabase
          .from('companies')
          .select('id, name')
          .eq('organization_id', userOrgId)
          .eq('domain', domain)
          .neq('id', id)
          .is('deleted_at', null)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          return NextResponse.json({ error: 'Failed to check for duplicate company' }, { status: 500 })
        }

        if (existing) {
          return NextResponse.json(
            { error: `A company with domain '${domain}' already exists (${existing.name})` },
            { status: 409 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A company with this name or domain already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 400 }
      )
    }

    if (oldData) logUpdate({ supabase, request }, 'company', id, oldData, data)

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: existing } = await supabase.from('companies').select('organization_id').eq('id', id).single()
    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !existing || existing.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active child references
    const [{ data: refContacts }, { data: refCampaigns }, { data: refSnapshots }, { data: refAssets }, { data: refDocs }] = await Promise.all([
      supabase.from('contacts').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
      supabase.from('campaigns').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
      supabase.from('digital_snapshots').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
      supabase.from('assets').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
      supabase.from('generated_documents').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
    ])
    if (refContacts?.length || refCampaigns?.length || refSnapshots?.length || refAssets?.length || refDocs?.length) {
      return NextResponse.json(
        { error: 'Cannot delete company — it has linked contacts, campaigns, or other records.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('companies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 400 }
      )
    }

    logDelete({ supabase, request }, 'company', data)

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