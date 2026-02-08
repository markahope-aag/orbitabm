import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createDocumentTemplateSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const documentType = searchParams.get('document_type')
    const verticalId = searchParams.get('vertical_id')
    const isActive = searchParams.get('is_active')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('document_templates')
      .select(`
        *,
        verticals:vertical_id(name)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)

    if (documentType) query = query.eq('document_type', documentType)
    if (verticalId) query = query.eq('vertical_id', verticalId)
    if (isActive !== null) query = query.eq('is_active', isActive === 'true')

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
    const validation = validateRequest(createDocumentTemplateSchema, body)
    if (!validation.success) return validation.response

    const { data, error } = await supabase
      .from('document_templates')
      .insert([validation.data])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    logCreate({ supabase, request }, 'document_template', data)

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
