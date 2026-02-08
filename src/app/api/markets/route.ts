import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createMarketSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { normalizeName } from '@/lib/utils/normalize'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = await resolveUserOrgId(supabase)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const query = supabase
      .from('markets')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)

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
    const validation = validateRequest(createMarketSchema, body)
    if (!validation.success) return validation.response

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const nameNormalized = normalizeName(validation.data.name)

    // Check for duplicate normalized name within organization
    if (nameNormalized) {
      const { data: existing, error: checkError } = await supabase
        .from('markets')
        .select('id, name')
        .eq('organization_id', userOrgId)
        .eq('name_normalized', nameNormalized)
        .is('deleted_at', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        return NextResponse.json(
          { error: 'Failed to check for duplicate market' },
          { status: 500 }
        )
      }

      if (existing) {
        return NextResponse.json(
          { error: `A market with a similar name already exists: '${existing.name}'` },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from('markets')
      .insert([{ ...validation.data, organization_id: userOrgId, name_normalized: nameNormalized }])
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
        { status: 400 }
      )
    }

    logCreate({ supabase, request }, 'market', data)

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