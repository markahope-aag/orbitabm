/**
 * Startup Environment Validation
 * 
 * This module performs critical environment variable validation during application startup.
 * It ensures that all required configuration is present and valid before the application
 * starts serving requests, preventing runtime errors and providing clear error messages.
 */

import { env, envValidationStatus, supabaseConfig } from './config'

/**
 * Validate environment variables during startup
 * This function is called automatically when the config module is imported
 */
function validateStartupEnvironment() {
  try {
    // The env import above will trigger validation
    // If we reach this point, validation was successful
    
    if (typeof window === 'undefined') {
      // Server-side startup validation
      console.log('🚀 OrbitABM Server Starting...')
      console.log('✅ Environment validation passed')
      console.log(`📊 Environment: ${env.NODE_ENV}`)
      console.log(`🔗 Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`)
      console.log(`🔑 Supabase Key: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Present' : '✗ Missing'}`)
      console.log(`🛡️  Service Key: ${supabaseConfig.serviceRoleKey ? '✓ Present' : '✗ Missing'}`)
      
      // Feature flags status
      const enabledFeatures = Object.entries(envValidationStatus.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature)
      
      if (enabledFeatures.length > 0) {
        console.log(`🎛️  Features enabled: ${enabledFeatures.join(', ')}`)
      }
      
      console.log('─'.repeat(60))
    }
    
    return true
  } catch (error) {
    // Environment validation failed
    console.error('💥 STARTUP FAILED - Environment Validation Error')
    console.error('─'.repeat(60))
    
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error('Unknown environment validation error:', error)
    }
    
    console.error('─'.repeat(60))
    console.error('🔧 To fix this issue:')
    console.error('1. Copy .env.local.example to .env.local')
    console.error('2. Fill in all required environment variables')
    console.error('3. Restart the application')
    console.error('─'.repeat(60))
    
    // In production, we want to fail fast
    if (env.NODE_ENV === 'production') {
      process.exit(1)
    }
    
    throw error
  }
}

/**
 * Runtime environment check
 * Use this function to validate environment at any point during runtime
 */
export function checkEnvironment() {
  return {
    isValid: envValidationStatus.isValid,
    environment: env.NODE_ENV,
    supabaseConfigured: !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceKeyConfigured: !!supabaseConfig.serviceRoleKey,
    features: envValidationStatus.features,
    validatedAt: envValidationStatus.validatedAt,
  }
}

/**
 * Get environment status for health checks
 */
export function getEnvironmentHealth() {
  const status = checkEnvironment()
  
  return {
    status: status.isValid ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: status.environment,
    checks: {
      supabaseUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!supabaseConfig.serviceRoleKey,
    },
    features: status.features,
  }
}

// Perform startup validation immediately when this module is imported
validateStartupEnvironment()

// Export the validation result for other modules to use
export { envValidationStatus as startupValidation }