import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateMarketSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logUpdate, logDelete } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { normalizeName } from '@/lib/utils/normalize'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('markets')
      .select('*')
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
    const validation = validateRequest(updateMarketSchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('markets').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If name is being updated, check for normalized name duplicates
    const updatePayload = { ...validation.data } as Record<string, unknown>
    if ('name' in validation.data) {
      const nameNormalized = normalizeName(validation.data.name!)
      updatePayload.name_normalized = nameNormalized

      if (nameNormalized) {
        const { data: existing, error: checkError } = await supabase
          .from('markets')
          .select('id, name')
          .eq('organization_id', userOrgId)
          .eq('name_normalized', nameNormalized)
          .neq('id', id)
          .is('deleted_at', null)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          return NextResponse.json({ error: 'Failed to check for duplicate market' }, { status: 500 })
        }

        if (existing) {
          return NextResponse.json(
            { error: `A market with a similar name already exists: '${existing.name}'` },
            { status: 409 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('markets')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A market with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 400 }
      )
    }

    if (oldData) await logUpdate({ supabase, request }, 'market', id, oldData, data)

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

    const { data: existing } = await supabase.from('markets').select('organization_id').eq('id', id).single()
    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !existing || existing.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active child references
    const [{ data: refCompanies }, { data: refCampaigns }] = await Promise.all([
      supabase.from('companies').select('id').eq('market_id', id).is('deleted_at', null).limit(1),
      supabase.from('campaigns').select('id').eq('market_id', id).is('deleted_at', null).limit(1),
    ])
    if (refCompanies?.length || refCampaigns?.length) {
      return NextResponse.json(
        { error: 'Cannot delete market — it is in use by companies or campaigns.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('markets')
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

    await logDelete({ supabase, request }, 'market', data)

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