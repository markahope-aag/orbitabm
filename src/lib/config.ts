import { z } from 'zod'

/**
 * Environment Variable Validation Schema
 * 
 * This schema validates all required environment variables at startup
 * to prevent runtime errors and provide clear error messages.
 */
const envSchema = z.object({
  // Node.js Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase Configuration (Required)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .refine(
      (url) => url.includes('.supabase.co') || url.includes('localhost'),
      'NEXT_PUBLIC_SUPABASE_URL must be a Supabase URL'
    ),
  
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .refine(
      (key) => key.startsWith('eyJ'),
      'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT token'
    ),
  
  // Service Role Key (Server-side only)
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for server operations')
    .refine(
      (key) => key.startsWith('eyJ'),
      'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token'
    )
    .optional(), // Optional for client-side builds
  
  // Optional Configuration
  NEXT_TELEMETRY_DISABLED: z
    .string()
    .optional()
    .transform((val) => val === '1' || val === 'true'),
  
  // Feature Flags (Optional)
  FEATURE_AUDIT_LOGS: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  
  FEATURE_DOCUMENT_INTELLIGENCE: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  
  FEATURE_EMAIL_TEMPLATES: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  
  // Development Settings
  DEBUG: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})

/**
 * Client-side environment schema (only NEXT_PUBLIC_ variables)
 */
const clientEnvSchema = envSchema.omit({
  SUPABASE_SERVICE_ROLE_KEY: true,
})

/**
 * Server-side environment schema (includes service role key)
 */
const serverEnvSchema = envSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for server operations')
    .refine(
      (key) => key.startsWith('eyJ'),
      'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token'
    ),
})

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    // Check if we're on the server or client
    const isServer = typeof window === 'undefined'
    
    if (isServer) {
      // Server-side validation (includes service role key)
      return serverEnvSchema.parse(process.env)
    } else {
      // Client-side validation (only public variables)
      return clientEnvSchema.parse(process.env)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join('\n')
      
      throw new Error(
        `❌ Environment variable validation failed:\n\n${missingVars}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.\n` +
        `See .env.local.example for the expected format.`
      )
    }
    throw error
  }
}

/**
 * Validated environment configuration
 * This will throw an error at startup if any required variables are missing
 */
export const env = validateEnv()

/**
 * Type-safe environment variables
 */
export type Environment = typeof env

/**
 * Helper function to check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Helper function to check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * Helper function to check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test'

/**
 * Helper function to get feature flag status
 */
export const isFeatureEnabled = (feature: 'FEATURE_AUDIT_LOGS' | 'FEATURE_DOCUMENT_INTELLIGENCE' | 'FEATURE_EMAIL_TEMPLATES') => {
  return env[feature] === true
}

/**
 * Supabase configuration object
 */
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY' in env ? (env as any).SUPABASE_SERVICE_ROLE_KEY : undefined,
} as const

/**
 * Debug logging helper
 */
export const debugLog = (...args: any[]) => {
  if (env.DEBUG === true && isDevelopment) {
    console.log('[DEBUG]', ...args)
  }
}

/**
 * Environment validation status
 */
export const envValidationStatus = {
  isValid: true,
  validatedAt: new Date().toISOString(),
  environment: env.NODE_ENV,
  features: {
    auditLogs: env.FEATURE_AUDIT_LOGS,
    documentIntelligence: env.FEATURE_DOCUMENT_INTELLIGENCE,
    emailTemplates: env.FEATURE_EMAIL_TEMPLATES,
  },
} as const

// Log successful validation in development
if (isDevelopment) {
  console.log('✅ Environment variables validated successfully')
  console.log('🔧 Environment:', env.NODE_ENV)
  console.log('🚀 Features enabled:', Object.entries(envValidationStatus.features)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature)
    .join(', ') || 'none')
}