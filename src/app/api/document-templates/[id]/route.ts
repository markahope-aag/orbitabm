import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateDocumentTemplateSchema } from '@/lib/validations/schemas'
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
      .from('document_templates')
      .select(`
        *,
        verticals:vertical_id(name)
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
    const validation = validateRequest(updateDocumentTemplateSchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('document_templates').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('document_templates')
      .update(validation.data)
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

    if (oldData) await logUpdate({ supabase, request }, 'document_template', id, oldData, data)

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

    const { data: existing } = await supabase.from('document_templates').select('organization_id').eq('id', id).is('deleted_at', null).single()
    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !existing || existing.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active child references
    const { data: refDocs } = await supabase
      .from('generated_documents').select('id').eq('document_template_id', id).is('deleted_at', null).limit(1)
    if (refDocs?.length) {
      return NextResponse.json(
        { error: 'Cannot delete document template — it has generated documents.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('document_templates')
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

    await logDelete({ supabase, request }, 'document_template', data)

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
