import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createCampaignSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = await resolveUserOrgId(supabase)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const status = searchParams.get('status')
    const marketId = searchParams.get('market_id')
    const verticalId = searchParams.get('vertical_id')
    const assignedTo = searchParams.get('assigned_to')
    const companyId = searchParams.get('company_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        companies (
          id,
          name,
          website,
          estimated_revenue
        ),
        markets (
          id,
          name,
          state
        ),
        verticals (
          id,
          name,
          sector
        ),
        playbook_templates (
          id,
          name,
          total_duration_days
        ),
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    // Apply filters
    if (status) query = query.eq('status', status)
    if (marketId) query = query.eq('market_id', marketId)
    if (verticalId) query = query.eq('vertical_id', verticalId)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (companyId) query = query.eq('company_id', companyId)

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch campaigns',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    return NextResponse.json({
      data,
      success: true,
      count
    })

  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          success: false,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: ERROR_CODES.SERVER_ERROR,
        success: false
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(createCampaignSchema, body)
    if (!validation.success) return validation.response

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, company_id, playbook_template_id, market_id, vertical_id } = validation.data

    // Verify that the company, market, and vertical exist and belong to the organization
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .eq('organization_id', userOrgId)
      .is('deleted_at', null)
      .single()

    if (companyError || !company) {
      throw new ApiError(
        'Company not found or does not belong to organization',
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id')
      .eq('id', market_id)
      .eq('organization_id', userOrgId)
      .is('deleted_at', null)
      .single()

    if (marketError || !market) {
      throw new ApiError(
        'Market not found or does not belong to organization',
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    const { data: vertical, error: verticalError } = await supabase
      .from('verticals')
      .select('id')
      .eq('id', vertical_id)
      .eq('organization_id', userOrgId)
      .is('deleted_at', null)
      .single()

    if (verticalError || !vertical) {
      throw new ApiError(
        'Vertical not found or does not belong to organization',
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    // Verify playbook template if provided
    if (playbook_template_id) {
      const { data: playbook, error: playbookError } = await supabase
        .from('playbook_templates')
        .select('id')
        .eq('id', playbook_template_id)
        .eq('organization_id', userOrgId)
        .is('deleted_at', null)
        .single()

      if (playbookError || !playbook) {
        throw new ApiError(
          'Playbook template not found or does not belong to organization',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
    }

    // Check for duplicate campaign names within organization
    const { data: existing, error: checkError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('organization_id', userOrgId)
      .eq('name', name)
      .is('deleted_at', null)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new ApiError(
        'Failed to check for duplicate campaign',
        ERROR_CODES.DATABASE_ERROR,
        500,
        checkError
      )
    }

    if (existing) {
      throw new ApiError(
        'Campaign with this name already exists',
        ERROR_CODES.DUPLICATE_ENTRY,
        409,
        { field: 'name', value: name }
      )
    }

    // Insert new campaign
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ ...validation.data, organization_id: userOrgId })
      .select(`
        *,
        companies (
          id,
          name,
          website
        ),
        markets (
          id,
          name,
          state
        ),
        verticals (
          id,
          name,
          sector
        ),
        playbook_templates (
          id,
          name,
          total_duration_days
        )
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create campaign',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    await logCreate({ supabase, request }, 'campaign', data)

    return NextResponse.json({
      data,
      success: true
    }, { status: 201 })

  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          success: false,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: ERROR_CODES.SERVER_ERROR,
        success: false
      },
      { status: 500 }
    )
  }
}