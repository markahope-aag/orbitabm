import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
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

    // Get user's profile to find their current organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user has a platform role
    const { data: platformRoleData } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    const platformRole = platformRoleData?.role ?? null

    let organizations
    let error

    if (platformRole) {
      // Platform users can see all organizations
      const result = await supabase
        .from('organizations')
        .select('*')
        .is('deleted_at', null)
        .order('name')
      organizations = result.data
      error = result.error
    } else {
      // Standard users only see their own organization
      const result = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .is('deleted_at', null)
        .order('name')
      organizations = result.data
      error = result.error
    }

    if (error) {
      console.error('Error fetching user organizations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organizations,
      current_organization_id: profile.organization_id,
      user_role: profile.role,
      platform_role: platformRole
    })

  } catch (error) {
    console.error('My Organizations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
