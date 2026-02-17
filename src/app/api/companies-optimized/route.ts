import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { withSecurity } from '@/lib/security/api-protection'
import { cacheKeys, invalidateCache, invalidationPatterns } from '@/lib/cache'
import { getCompaniesWithRelations, batchCreateCompanies, QueryMonitor } from '@/lib/query/optimization'

/**
 * Optimized Companies API
 * 
 * Demonstrates performance optimizations:
 * - Intelligent caching with stale-while-revalidate
 * - Eager loading to prevent N+1 queries
 * - Query result caching
 * - Batch operations
 * - Performance monitoring
 */

async function getHandler(request: NextRequest) {
  const startTime = Date.now()
  
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

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organization_id')
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Parse filters and options
    const filters = {
      market_id: searchParams.get('market_id'),
      vertical_id: searchParams.get('vertical_id'),
      status: searchParams.get('status'),
      ownership_type: searchParams.get('ownership_type'),
      qualifying_tier: searchParams.get('qualifying_tier'),
    }

    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === null || filters[key as keyof typeof filters] === '') {
        delete filters[key as keyof typeof filters]
      }
    })

    const options = {
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }

    // Use optimized query with caching
    const result = await getCompaniesWithRelations(organizationId, filters, options)

    const duration = Date.now() - startTime
    QueryMonitor.logQuery(`companies:${organizationId}`, duration, true)

    return NextResponse.json({
      data: result.data,
      count: result.count,
      success: true,
      meta: {
        filters,
        pagination: options,
        performance: {
          duration,
          cached: true,
        },
      },
    })

  } catch (error) {
    const duration = Date.now() - startTime
    QueryMonitor.logQuery(`companies:error`, duration, false)
    
    console.error('Optimized companies GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest) {
  const startTime = Date.now()
  
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

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companies, organization_id, batch_mode = false } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    let result

    if (batch_mode && Array.isArray(companies)) {
      // Batch creation for bulk operations
      result = await batchCreateCompanies(companies, organization_id)
      
      // Invalidate all company-related caches
      invalidateCache(invalidationPatterns.companies(organization_id))
      
    } else {
      // Single company creation
      const companyData = Array.isArray(companies) ? companies[0] : body
      
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          ...companyData,
          organization_id,
        }])
        .select(`
          *,
          markets (id, name),
          verticals (id, name)
        `)
        .single()

      if (error) {
        throw error
      }

      result = data

      // Invalidate specific caches
      invalidateCache([
        cacheKeys.companies(organization_id),
        cacheKeys.companies(organization_id, {}), // Default filters
      ])
    }

    const duration = Date.now() - startTime
    QueryMonitor.logQuery(`companies:create`, duration, false)

    return NextResponse.json({
      data: result,
      success: true,
      meta: {
        batch_mode,
        count: Array.isArray(result) ? result.length : 1,
        performance: {
          duration,
        },
      },
    }, { status: 201 })

  } catch (error) {
    const duration = Date.now() - startTime
    QueryMonitor.logQuery(`companies:create:error`, duration, false)
    
    console.error('Optimized companies POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Performance analytics endpoint
async function optionsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'performance') {
      const stats = QueryMonitor.getStats()
      const slowQueries = QueryMonitor.getSlowQueries(5)

      return NextResponse.json({
        performance: stats,
        slowQueries,
        recommendations: generatePerformanceRecommendations(stats),
        timestamp: new Date().toISOString(),
      })
    }

    if (action === 'cache-status') {
      const { getCacheMetrics } = await import('@/lib/cache')
      const metrics = getCacheMetrics()

      return NextResponse.json({
        cache: metrics,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      methods: ['GET', 'POST', 'OPTIONS'],
      actions: ['performance', 'cache-status'],
    })

  } catch (error) {
    console.error('Performance analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generatePerformanceRecommendations(stats: { cacheHitRate: number; avgDuration: number; slowQueryRate: number }): string[] {
  const recommendations: string[] = []

  if (stats.cacheHitRate < 0.6) {
    recommendations.push('Cache hit rate is low. Consider increasing cache TTL or adding more strategic caching.')
  }

  if (stats.avgDuration > 300) {
    recommendations.push('Average query duration is high. Consider adding database indexes or optimizing queries.')
  }

  if (stats.slowQueryRate > 0.05) {
    recommendations.push('High percentage of slow queries detected. Review and optimize query patterns.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance looks good! No immediate optimizations needed.')
  }

  return recommendations
}

// Export handlers with security protection
export const GET = withSecurity(getHandler, {
  requireCSRF: false, // GET requests don't need CSRF protection
  rateLimit: true,
  methods: ['GET'],
})

export const POST = withSecurity(postHandler, {
  requireCSRF: true,  // POST requests require CSRF protection
  rateLimit: true,
  methods: ['POST'],
})

export const OPTIONS = withSecurity(optionsHandler, {
  requireCSRF: false,
  rateLimit: false,
  methods: ['OPTIONS'],
})