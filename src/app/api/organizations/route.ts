import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ITEMS_PER_PAGE = 20

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || ITEMS_PER_PAGE.toString())
    const type = searchParams.get('type') // 'agency' or 'client'
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (type && ['agency', 'client'].includes(type)) {
      query = query.eq('type', type)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data: organizations, error, count } = await query

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: error.message },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: organizations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Organizations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, type, website, notes } = body

    // Validation
    if (!name || !slug || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, type' },
        { status: 400 }
      )
    }

    if (!['agency', 'client'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "agency" or "client"' },
        { status: 400 }
      )
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      )
    }

    // Check for duplicate slug
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        type,
        website: website || null,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      return NextResponse.json(
        { error: 'Failed to create organization', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization
    }, { status: 201 })

  } catch (error) {
    console.error('Organizations POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}