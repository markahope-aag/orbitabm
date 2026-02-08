import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { logUpdate } from '@/lib/audit'
import { z } from 'zod'

const reassignOrgSchema = z.object({
  organization_id: z.string().uuid(),
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
    const parsed = reassignOrgSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Verify target org exists and is not deleted
    const { data: targetOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', parsed.data.organization_id)
      .is('deleted_at', null)
      .single()

    if (orgError || !targetOrg) {
      return NextResponse.json({ error: 'Target organization not found' }, { status: 404 })
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

    // Update organization
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ organization_id: parsed.data.organization_id })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error reassigning user org:', updateError)
      return NextResponse.json(
        { error: 'Failed to reassign organization', details: updateError.message },
        { status: 500 }
      )
    }

    await logUpdate({ supabase, request }, 'profile', id, existing, updated)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Platform org reassign API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
