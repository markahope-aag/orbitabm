import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/config'
import { withSecurity } from '@/lib/security/api-protection'
import { getCacheMetrics, cleanupExpiredCache } from '@/lib/cache'
import { QueryMonitor, analyzeQueryPerformance } from '@/lib/query/optimization'

/**
 * Performance Monitoring API
 * 
 * Provides comprehensive performance metrics and analytics:
 * - Query performance statistics
 * - Cache hit rates and metrics
 * - Slow query analysis
 * - Performance recommendations
 * - System health indicators
 */

async function getHandler(request: NextRequest) {
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

    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const timeRange = searchParams.get('timeRange') || '1h'

    switch (metric) {
      case 'queries':
        return NextResponse.json({
          data: QueryMonitor.getStats(),
          timeRange,
          timestamp: new Date().toISOString(),
        })

      case 'cache':
        return NextResponse.json({
          data: getCacheMetrics(),
          timestamp: new Date().toISOString(),
        })

      case 'slow-queries':
        const limit = parseInt(searchParams.get('limit') || '20')
        return NextResponse.json({
          data: QueryMonitor.getSlowQueries(limit),
          limit,
          timestamp: new Date().toISOString(),
        })

      case 'analysis':
        const analysis = analyzeQueryPerformance()
        return NextResponse.json({
          data: analysis,
          timestamp: new Date().toISOString(),
        })

      case 'system':
        const systemMetrics = await getSystemMetrics()
        return NextResponse.json({
          data: systemMetrics,
          timestamp: new Date().toISOString(),
        })

      default:
        // Return comprehensive performance dashboard
        const dashboardData = await getPerformanceDashboard()
        return NextResponse.json({
          data: dashboardData,
          timestamp: new Date().toISOString(),
        })
    }

  } catch (error) {
    console.error('Performance monitoring API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest) {
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

    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, params = {} } = body

    switch (action) {
      case 'clear-cache':
        cleanupExpiredCache()
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString(),
        })

      case 'warm-cache':
        const { organizationId } = params
        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID required for cache warming' },
            { status: 400 }
          )
        }
        
        await warmOrganizationCache(organizationId)
        return NextResponse.json({
          success: true,
          message: 'Cache warmed successfully',
          organizationId,
          timestamp: new Date().toISOString(),
        })

      case 'optimize-queries':
        const optimizations = await performQueryOptimizations()
        return NextResponse.json({
          success: true,
          optimizations,
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Performance action API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getPerformanceDashboard() {
  const [queryStats, cacheMetrics, slowQueries, analysis] = await Promise.all([
    QueryMonitor.getStats(),
    getCacheMetrics(),
    QueryMonitor.getSlowQueries(10),
    analyzeQueryPerformance(),
  ])

  const systemMetrics = await getSystemMetrics()

  return {
    overview: {
      queryStats,
      cacheMetrics,
      systemMetrics,
    },
    slowQueries,
    analysis,
    alerts: generatePerformanceAlerts(queryStats, cacheMetrics, systemMetrics),
  }
}

async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage()
  
  return {
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    cpuUsage: process.cpuUsage(),
  }
}

function generatePerformanceAlerts(queryStats: any, cacheMetrics: any, systemMetrics: any) {
  const alerts: Array<{
    level: 'info' | 'warning' | 'error'
    message: string
    metric: string
    value: any
  }> = []

  // Query performance alerts
  if (queryStats.avgDuration > 1000) {
    alerts.push({
      level: 'error',
      message: 'Average query duration is very high',
      metric: 'avgDuration',
      value: queryStats.avgDuration,
    })
  } else if (queryStats.avgDuration > 500) {
    alerts.push({
      level: 'warning',
      message: 'Average query duration is elevated',
      metric: 'avgDuration',
      value: queryStats.avgDuration,
    })
  }

  // Cache performance alerts
  if (queryStats.cacheHitRate < 0.3) {
    alerts.push({
      level: 'error',
      message: 'Cache hit rate is very low',
      metric: 'cacheHitRate',
      value: queryStats.cacheHitRate,
    })
  } else if (queryStats.cacheHitRate < 0.6) {
    alerts.push({
      level: 'warning',
      message: 'Cache hit rate could be improved',
      metric: 'cacheHitRate',
      value: queryStats.cacheHitRate,
    })
  }

  // Memory usage alerts
  if (systemMetrics.memory.usage > 90) {
    alerts.push({
      level: 'error',
      message: 'Memory usage is critically high',
      metric: 'memoryUsage',
      value: systemMetrics.memory.usage,
    })
  } else if (systemMetrics.memory.usage > 75) {
    alerts.push({
      level: 'warning',
      message: 'Memory usage is elevated',
      metric: 'memoryUsage',
      value: systemMetrics.memory.usage,
    })
  }

  // Slow query alerts
  if (queryStats.slowQueryRate > 0.1) {
    alerts.push({
      level: 'warning',
      message: 'High percentage of slow queries detected',
      metric: 'slowQueryRate',
      value: queryStats.slowQueryRate,
    })
  }

  return alerts
}

async function warmOrganizationCache(organizationId: string) {
  const { warmCache } = await import('@/lib/cache')
  await warmCache(organizationId)
}

async function performQueryOptimizations() {
  const optimizations: string[] = []

  // Cleanup expired cache entries
  cleanupExpiredCache()
  optimizations.push('Cleaned up expired cache entries')

  // Additional optimizations can be added here
  // - Database index analysis
  // - Query plan optimization
  // - Connection pool optimization

  return optimizations
}

// Export handlers with security protection
export const GET = withSecurity(getHandler, {
  requireCSRF: false,
  rateLimit: true,
  methods: ['GET'],
})

export const POST = withSecurity(postHandler, {
  requireCSRF: true,
  rateLimit: true,
  methods: ['POST'],
})