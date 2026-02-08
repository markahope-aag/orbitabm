import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { logCreate, logUpdate, logDelete } from '@/lib/audit'
import { z } from 'zod'

const grantRoleSchema = z.object({
  role: z.enum(['platform_owner', 'platform_admin']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Only platform_owner can grant/revoke platform roles
    const { data: callerRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!callerRole || callerRole.role !== 'platform_owner') {
      return NextResponse.json({ error: 'Forbidden: only platform owners can manage platform roles' }, { status: 403 })
    }

    // Validate body
    const body = await request.json()
    const parsed = grantRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Check if target user exists
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if platform role already exists
    const { data: existing } = await supabase
      .from('platform_roles')
      .select('*')
      .eq('user_id', id)
      .single()

    // Upsert platform role
    const { data: result, error: upsertError } = await supabase
      .from('platform_roles')
      .upsert({ user_id: id, role: parsed.data.role }, { onConflict: 'user_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting platform role:', upsertError)
      return NextResponse.json(
        { error: 'Failed to grant platform role', details: upsertError.message },
        { status: 500 }
      )
    }

    if (existing) {
      await logUpdate({ supabase, request }, 'platform_role', id, existing, result)
    } else {
      await logCreate({ supabase, request }, 'platform_role', result)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Platform role grant API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Only platform_owner can revoke platform roles
    const { data: callerRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!callerRole || callerRole.role !== 'platform_owner') {
      return NextResponse.json({ error: 'Forbidden: only platform owners can manage platform roles' }, { status: 403 })
    }

    // Prevent removing own platform_owner role (lockout protection)
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove your own platform owner role' },
        { status: 400 }
      )
    }

    // Check if platform role exists
    const { data: existing } = await supabase
      .from('platform_roles')
      .select('*')
      .eq('user_id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Platform role not found' }, { status: 404 })
    }

    // Delete platform role
    const { error: deleteError } = await supabase
      .from('platform_roles')
      .delete()
      .eq('user_id', id)

    if (deleteError) {
      console.error('Error deleting platform role:', deleteError)
      return NextResponse.json(
        { error: 'Failed to revoke platform role', details: deleteError.message },
        { status: 500 }
      )
    }

    await logDelete({ supabase, request }, 'platform_role', existing)

    return NextResponse.json({ success: true, message: 'Platform role revoked' })
  } catch (error) {
    console.error('Platform role revoke API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
