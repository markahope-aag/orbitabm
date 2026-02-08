import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { logSecurityEvent } from '@/lib/security'

/**
 * Security Incident Reporting API
 * 
 * Allows client-side code to report security incidents for monitoring and analysis.
 * This helps identify potential attacks and security issues.
 * 
 * POST /api/security/report
 */
export async function POST(request: NextRequest) {
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

    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { type, details, timestamp, userAgent, url } = body

    // Validate incident type
    const validTypes = ['xss_attempt', 'csrf_mismatch', 'invalid_input', 'suspicious_behavior']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid incident type' }, { status: 400 })
    }

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Log the security incident
    logSecurityEvent({
      type: type as any,
      ip: clientIP,
      userAgent: userAgent || request.headers.get('user-agent') || undefined,
      path: url || request.nextUrl.pathname,
      details: {
        reportedBy: session.user.id,
        reportedAt: timestamp,
        clientUrl: url,
        incidentDetails: details,
      },
    })

    // In a production environment, you might want to:
    // 1. Store incidents in a database for analysis
    // 2. Send alerts for critical incidents
    // 3. Implement rate limiting for incident reports
    // 4. Aggregate incidents for threat intelligence

    // For now, we'll store in Supabase audit logs if available
    try {
      const { error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: session.user.id,
          organization_id: null, // Security incidents are global
          action: 'security_incident',
          table_name: 'security',
          record_id: null,
          old_values: null,
          new_values: {
            incident_type: type,
            client_ip: clientIP,
            user_agent: userAgent,
            url: url,
            details: details,
            timestamp: timestamp,
          },
          metadata: {
            source: 'client_report',
            severity: getSeverityLevel(type),
          },
        })

      if (insertError) {
        console.warn('Failed to log security incident to database:', insertError)
      }
    } catch (dbError) {
      console.warn('Database logging failed for security incident:', dbError)
    }

    return NextResponse.json({
      success: true,
      message: 'Security incident reported successfully',
      incident_id: generateIncidentId(),
    })

  } catch (error) {
    console.error('Security report API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to process security report' },
      { status: 500 }
    )
  }
}

/**
 * Generate a unique incident ID for tracking
 */
function generateIncidentId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `SEC-${timestamp}-${random}`.toUpperCase()
}

/**
 * Determine severity level based on incident type
 */
function getSeverityLevel(type: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (type) {
    case 'xss_attempt':
      return 'high'
    case 'csrf_mismatch':
      return 'medium'
    case 'invalid_input':
      return 'low'
    case 'suspicious_behavior':
      return 'medium'
    default:
      return 'low'
  }
}

/**
 * GET endpoint for security incident statistics (admin only)
 */
export async function GET(request: NextRequest) {
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

    // Verify authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you'll need to implement role checking)
    // For now, we'll return basic stats for any authenticated user
    
    // Get recent security incidents from audit logs
    const { data: incidents, error: queryError } = await supabase
      .from('audit_logs')
      .select('action, new_values, created_at')
      .eq('action', 'security_incident')
      .order('created_at', { ascending: false })
      .limit(100)

    if (queryError) {
      console.error('Failed to query security incidents:', queryError)
      return NextResponse.json({ error: 'Failed to retrieve incidents' }, { status: 500 })
    }

    // Aggregate statistics
    const stats = {
      total_incidents: incidents?.length || 0,
      incidents_by_type: {} as Record<string, number>,
      incidents_by_severity: {} as Record<string, number>,
      recent_incidents: incidents?.slice(0, 10) || [],
    }

    // Process incidents for statistics
    incidents?.forEach(incident => {
      const incidentType = incident.new_values?.incident_type || 'unknown'
      const severity = getSeverityLevel(incidentType)
      
      stats.incidents_by_type[incidentType] = (stats.incidents_by_type[incidentType] || 0) + 1
      stats.incidents_by_severity[severity] = (stats.incidents_by_severity[severity] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      statistics: stats,
      generated_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Security stats API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve security statistics' },
      { status: 500 }
    )
  }
}