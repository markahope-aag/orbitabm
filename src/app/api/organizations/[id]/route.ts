import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        *,
        profiles:profiles(count)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching organization:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organization', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization
    })

  } catch (error) {
    console.error('Organization GET API error:', error)
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
    const { id } = await params
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

    // Check if organization exists
    const { data: existingOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('id, slug')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, slug, type, website, notes } = body

    // Validate type if provided
    if (type && !['agency', 'client'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "agency" or "client"' },
        { status: 400 }
      )
    }

    // Validate slug format if provided
    if (slug) {
      const slugRegex = /^[a-z0-9-]+$/
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only' },
          { status: 400 }
        )
      }

      // Check for duplicate slug (excluding current organization)
      if (slug !== existingOrg.slug) {
        const { data: duplicateOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', slug)
          .neq('id', id)
          .is('deleted_at', null)
          .single()

        if (duplicateOrg) {
          return NextResponse.json(
            { error: 'Organization with this slug already exists' },
            { status: 409 }
          )
        }
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, string | null> = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (type !== undefined) updateData.type = type
    if (website !== undefined) updateData.website = website || null
    if (notes !== undefined) updateData.notes = notes || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json(
        { error: 'Failed to update organization', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization
    })

  } catch (error) {
    console.error('Organization PATCH API error:', error)
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
    const { id } = await params
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

    // Check if organization exists
    const { data: existingOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization has active users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', id)
      .limit(1)

    if (profilesError) {
      console.error('Error checking organization usage:', profilesError)
      return NextResponse.json(
        { error: 'Failed to check organization usage' },
        { status: 500 }
      )
    }

    if (profiles && profiles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with active users. Please reassign or remove users first.' },
        { status: 409 }
      )
    }

    // Soft delete the organization
    const { error } = await supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization:', error)
      return NextResponse.json(
        { error: 'Failed to delete organization', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully'
    })

  } catch (error) {
    console.error('Organization DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}