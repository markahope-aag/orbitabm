import { NextResponse } from 'next/server'
import { getEnvironmentHealth } from '@/lib/startup-validation'

/**
 * Health Check API Endpoint
 * 
 * Provides system health status including environment configuration validation.
 * Used for monitoring, deployment verification, and debugging.
 * 
 * GET /api/health
 */
export async function GET() {
  try {
    const health = getEnvironmentHealth()
    
    // Determine HTTP status based on health
    const status = health.status === 'healthy' ? 200 : 503
    
    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp,
      environment: health.environment,
      version: process.env.npm_package_version || '2.1.0',
      uptime: process.uptime(),
      checks: {
        environment: health.checks,
        features: health.features,
        database: {
          // We don't test actual DB connection in health check to avoid overhead
          // But we verify that configuration is present
          configured: health.checks.supabaseUrl && health.checks.supabaseAnonKey
        }
      },
      // Include memory usage in development
      ...(health.environment === 'development' && {
        memory: process.memoryUsage(),
        node: process.version,
        platform: process.platform,
      })
    }, { status })
    
  } catch (error) {
    // Health check should never fail completely
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        environment: false,
        features: false,
        database: false,
      }
    }, { status: 503 })
  }
}

/**
 * HEAD request for simple uptime checks
 */
export async function HEAD() {
  try {
    const health = getEnvironmentHealth()
    const status = health.status === 'healthy' ? 200 : 503
    return new Response(null, { status })
  } catch {
    return new Response(null, { status: 503 })
  }
}