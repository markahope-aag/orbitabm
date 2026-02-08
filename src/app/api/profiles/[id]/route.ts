import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logUpdate } from '@/lib/audit'
import { supabaseConfig } from '@/lib/config'

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

    // Users can only update their own profile
    if (id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : null

    if (!fullName || fullName.length === 0) {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
    }

    if (fullName.length > 200) {
      return NextResponse.json({ error: 'full_name must be 200 characters or fewer' }, { status: 400 })
    }

    // Fetch existing profile for audit diff
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile', details: error.message },
        { status: 500 }
      )
    }

    await logUpdate({ supabase, request }, 'organization', id, existingProfile, profile)

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error) {
    console.error('Profile PATCH API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
