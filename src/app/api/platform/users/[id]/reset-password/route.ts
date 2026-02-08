import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { logCreate } from '@/lib/audit'

export async function POST(
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

    // Verify caller is platform_owner or platform_admin
    const { data: callerRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!callerRole || !['platform_owner', 'platform_admin'].includes(callerRole.role)) {
      return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 })
    }

    // Get target user's email
    const adminClient = createAdminClient()
    const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId)

    if (getUserError || !authUser?.user?.email) {
      return NextResponse.json({ error: 'User not found or has no email' }, { status: 404 })
    }

    const email = authUser.user.email

    // Send password reset email
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
    })

    if (resetError) {
      console.error('Error sending password reset:', resetError)
      return NextResponse.json(
        { error: resetError.message || 'Failed to send password reset' },
        { status: 500 }
      )
    }

    // Audit log the action
    await logCreate({ supabase, request }, 'profile', {
      id: targetUserId,
      organization_id: null,
    }, {
      action_type: 'password_reset_sent',
      target_email: email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Platform password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
