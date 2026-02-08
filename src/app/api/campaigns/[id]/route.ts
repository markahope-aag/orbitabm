import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updateCampaignSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logUpdate, logDelete } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        companies (
          id,
          name,
          website,
          estimated_revenue,
          employee_count,
          status as company_status
        ),
        markets (
          id,
          name,
          state,
          metro_population
        ),
        verticals (
          id,
          name,
          sector,
          b2b_b2c
        ),
        playbook_templates (
          id,
          name,
          description,
          total_duration_days,
          playbook_steps (
            id,
            step_number,
            channel,
            action_type,
            subject_line,
            message_template,
            delay_days
          )
        ),
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Campaign not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to fetch campaign',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || (data as unknown as Record<string, unknown>).organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      data,
      success: true
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const validation = validateRequest(updateCampaignSchema, body)
    if (!validation.success) return validation.response
    const updateData = validation.data

    // If name is being updated, check for duplicates
    if (updateData.name) {
      const { data: existing, error: checkError } = await supabase
        .from('campaigns')
        .select('id, organization_id')
        .eq('name', updateData.name)
        .neq('id', id)
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
          { field: 'name', value: updateData.name }
        )
      }
    }

    // Verify foreign key references if they're being updated
    if (updateData.company_id || updateData.market_id || updateData.vertical_id || updateData.playbook_template_id) {
      // Get the current campaign to get organization_id
      const { data: currentCampaign, error: currentError } = await supabase
        .from('campaigns')
        .select('organization_id')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (currentError || !currentCampaign) {
        throw new ApiError(
          'Campaign not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }

      const organizationId = currentCampaign.organization_id

      // Verify company if being updated
      if (updateData.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('id', updateData.company_id)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .single()

        if (companyError || !company) {
          throw new ApiError(
            'Company not found or does not belong to organization',
            ERROR_CODES.NOT_FOUND,
            404
          )
        }
      }

      // Verify market if being updated
      if (updateData.market_id) {
        const { data: market, error: marketError } = await supabase
          .from('markets')
          .select('id')
          .eq('id', updateData.market_id)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .single()

        if (marketError || !market) {
          throw new ApiError(
            'Market not found or does not belong to organization',
            ERROR_CODES.NOT_FOUND,
            404
          )
        }
      }

      // Verify vertical if being updated
      if (updateData.vertical_id) {
        const { data: vertical, error: verticalError } = await supabase
          .from('verticals')
          .select('id')
          .eq('id', updateData.vertical_id)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .single()

        if (verticalError || !vertical) {
          throw new ApiError(
            'Vertical not found or does not belong to organization',
            ERROR_CODES.NOT_FOUND,
            404
          )
        }
      }

      // Verify playbook template if being updated
      if (updateData.playbook_template_id) {
        const { data: playbook, error: playbookError } = await supabase
          .from('playbook_templates')
          .select('id')
          .eq('id', updateData.playbook_template_id)
          .eq('organization_id', organizationId)
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
    }

    const { data: oldData } = await supabase.from('campaigns').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
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
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Campaign not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to update campaign',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (oldData) logUpdate({ supabase, request }, 'campaign', id, oldData, data)

    return NextResponse.json({
      data,
      success: true
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check if campaign has activities or results
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('campaign_id', id)
      .limit(1)

    if (activitiesError) {
      throw new ApiError(
        'Failed to check campaign activities',
        ERROR_CODES.DATABASE_ERROR,
        500,
        activitiesError
      )
    }

    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('id')
      .eq('campaign_id', id)
      .limit(1)

    if (resultsError) {
      throw new ApiError(
        'Failed to check campaign results',
        ERROR_CODES.DATABASE_ERROR,
        500,
        resultsError
      )
    }

    if ((activities && activities.length > 0) || (results && results.length > 0)) {
      throw new ApiError(
        'Cannot delete campaign with existing activities or results',
        ERROR_CODES.VALIDATION_ERROR,
        409,
        { reason: 'campaign_has_data' }
      )
    }

    // Pre-fetch campaign data for audit logging
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !campaignData || campaignData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete the campaign
    const { error } = await supabase
      .from('campaigns')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Campaign not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to delete campaign',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (campaignData) {
      logDelete({ supabase, request }, 'campaign', campaignData)
    }

    return NextResponse.json({
      data: { id, deleted: true },
      success: true
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