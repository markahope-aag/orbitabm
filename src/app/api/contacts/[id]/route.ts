import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateContactSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logUpdate, logDelete } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        companies (name)
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
    const validation = validateRequest(updateContactSchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('contacts').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If email is being updated, check for duplicates
    const updatePayload = { ...validation.data } as Record<string, unknown>
    if ('email' in validation.data && validation.data.email) {
      const email = validation.data.email.toLowerCase()
      updatePayload.email = email

      const { data: existing, error: checkError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('organization_id', userOrgId)
        .ilike('email', email)
        .neq('id', id)
        .is('deleted_at', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        return NextResponse.json({ error: 'Failed to check for duplicate contact' }, { status: 500 })
      }

      if (existing) {
        return NextResponse.json(
          { error: `A contact with email '${email}' already exists (${existing.first_name} ${existing.last_name})` },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A contact with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 400 }
      )
    }

    if (oldData) await logUpdate({ supabase, request }, 'contact', id, oldData, data)

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

    const { data: existing } = await supabase.from('contacts').select('organization_id').eq('id', id).single()
    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !existing || existing.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active child references
    const { data: refActivities } = await supabase
      .from('activities').select('id').eq('contact_id', id).is('deleted_at', null).limit(1)
    if (refActivities?.length) {
      return NextResponse.json(
        { error: 'Cannot delete contact — it has linked activities.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('contacts')
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

    await logDelete({ supabase, request }, 'contact', data)

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