import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createContactSchema } from '@/lib/validations/schemas'
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
    const companyId = searchParams.get('company_id')
    const relationshipStatus = searchParams.get('relationship_status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('contacts')
      .select(`
        *,
        companies (name)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    // Apply filters
    if (companyId) query = query.eq('company_id', companyId)
    if (relationshipStatus) query = query.eq('relationship_status', relationshipStatus)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

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
    const validation = validateRequest(createContactSchema, body)
    if (!validation.success) return validation.response

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Normalize email to lowercase
    const email = validation.data.email.toLowerCase()

    // Check for duplicate email within organization
    const { data: existing, error: checkError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('organization_id', userOrgId)
      .ilike('email', email)
      .is('deleted_at', null)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check for duplicate contact' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: `A contact with email '${email}' already exists (${existing.first_name} ${existing.last_name})` },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ ...validation.data, email, organization_id: userOrgId }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A contact with this email already exists` },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    logCreate({ supabase, request }, 'contact', data)

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