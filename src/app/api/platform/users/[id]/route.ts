import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { logDelete } from '@/lib/audit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params
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

    // Prevent self-deletion
    if (session.user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
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

    // Prevent deleting a platform_owner (safety guard)
    const { data: targetPlatformRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single()

    if (targetPlatformRole?.role === 'platform_owner') {
      return NextResponse.json({ error: 'Cannot delete a platform owner' }, { status: 400 })
    }

    // Fetch profile for audit logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Nullify campaigns.assigned_to for this user (FK without CASCADE)
    await adminClient
      .from('campaigns')
      .update({ assigned_to: null })
      .eq('assigned_to', targetUserId)

    // Delete the auth user — cascades to profiles + platform_roles
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Audit log the deletion
    await logDelete({ supabase, request }, 'profile', {
      ...profile,
      id: targetUserId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Platform user DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
