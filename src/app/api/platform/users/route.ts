import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { logCreate } from '@/lib/audit'
import { z } from 'zod'
import type { PlatformRole, UserRole } from '@/lib/types/database'

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  organization_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'user', 'viewer']),
})

async function getAuthenticatedClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await getAuthenticatedClient(cookieStore)

    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify caller is a platform user
    const { data: callerRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!callerRole) {
      return NextResponse.json({ error: 'Forbidden: platform access required' }, { status: 403 })
    }

    // Fetch profiles with org names
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at, organization_id, organizations(name)')
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    // Fetch platform roles
    const { data: platformRoles } = await supabase
      .from('platform_roles')
      .select('user_id, role')

    const platformMap: Record<string, PlatformRole> = {}
    for (const pr of platformRoles || []) {
      platformMap[pr.user_id] = pr.role as PlatformRole
    }

    // Fetch auth users for emails via admin client
    const adminClient = createAdminClient()
    const { data: authData, error: authListError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (authListError) {
      console.error('Error listing auth users:', authListError)
    }

    const emailMap: Record<string, string> = {}
    for (const u of authData?.users || []) {
      if (u.email) emailMap[u.id] = u.email
    }

    // Merge everything
    const users = (profiles || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      full_name: p.full_name as string | null,
      email: emailMap[p.id as string] || null,
      role: p.role as UserRole,
      created_at: p.created_at as string,
      organization_id: p.organization_id as string,
      orgName: (p.organizations as { name: string } | null)?.name || 'Unknown',
      platformRole: platformMap[p.id as string] || null,
    }))

    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Platform users GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await getAuthenticatedClient(cookieStore)

    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify caller is platform_owner or platform_admin
    const { data: callerRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!callerRole || !['platform_owner', 'platform_admin'].includes(callerRole.role)) {
      return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 })
    }

    // Validate body
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { email, full_name, organization_id, role } = parsed.data

    // Verify org exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organization_id)
      .is('deleted_at', null)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Invite user via admin API — redirect to set-password page after invite link click
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const adminClient = createAdminClient()
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name },
        redirectTo: `${origin}/auth/set-password`,
      }
    )

    if (inviteError) {
      console.error('Error inviting user:', inviteError)
      return NextResponse.json(
        { error: inviteError.message || 'Failed to invite user' },
        { status: 400 }
      )
    }

    const newUserId = inviteData.user.id

    // Update profile with correct org and role (trigger creates with defaults)
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({ organization_id, role, full_name })
      .eq('id', newUserId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile after invite:', updateError)
    }

    // Audit log
    await logCreate({ supabase, request }, 'profile', {
      id: newUserId,
      organization_id,
      email,
      full_name,
      role,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newUserId,
        email,
        full_name,
        organization_id,
        role,
        ...(updatedProfile || {}),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Platform users POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
