import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { logUpdate } from '@/lib/audit'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'user', 'viewer']),
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

    // Verify caller is a platform user
    const { data: callerRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!callerRole) {
      return NextResponse.json({ error: 'Forbidden: platform access required' }, { status: 403 })
    }

    // Validate body
    const body = await request.json()
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Fetch existing profile
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update role
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ role: parsed.data.role })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role', details: updateError.message },
        { status: 500 }
      )
    }

    await logUpdate({ supabase, request }, 'profile', id, existing, updated)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Platform role update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
