# Environment Variable Validation

OrbitABM includes comprehensive environment variable validation to prevent runtime errors and ensure proper configuration. This document explains the validation system and how to troubleshoot configuration issues.

## Overview

The environment validation system:
- ✅ Validates all required environment variables at startup
- ✅ Provides clear error messages for missing or invalid values
- ✅ Supports both client-side and server-side validation
- ✅ Includes type safety and runtime checks
- ✅ Offers health check endpoints for monitoring

## Required Environment Variables

### Supabase Configuration (Required)

```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Anonymous Key (Public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Optional Configuration

```bash
# Node.js Environment (auto-detected)
NODE_ENV=development

# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1

# Feature Flags (default: enabled)
FEATURE_AUDIT_LOGS=true
FEATURE_DOCUMENT_INTELLIGENCE=true
FEATURE_EMAIL_TEMPLATES=true

# Debug logging (development only)
DEBUG=true
```

## Validation Rules

### URL Validation
- Must be a valid URL format
- Must contain `.supabase.co` or `localhost` (for local development)
- Must use HTTPS protocol (except localhost)

### JWT Token Validation
- Both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be valid JWT tokens
- Must start with `eyJ` (JWT header)
- Tokens are validated for format but not signature (for security)

### Environment-Specific Validation
- **Client-side**: Only validates `NEXT_PUBLIC_*` variables
- **Server-side**: Validates all variables including service role key
- **Scripts**: Direct validation with enhanced error messages

## Validation Flow

### 1. Startup Validation

Environment validation occurs automatically when the application starts:

```typescript
// Automatic validation on import
import { env } from '@/lib/config'

// The env object contains validated, type-safe environment variables
console.log(env.NEXT_PUBLIC_SUPABASE_URL) // ✅ Guaranteed to be valid
```

### 2. Runtime Validation

Check environment status at runtime:

```typescript
import { checkEnvironment } from '@/lib/startup-validation'

const status = checkEnvironment()
if (!status.isValid) {
  // Handle invalid environment
}
```

### 3. Health Check Endpoint

Monitor environment health via API:

```bash
# Check system health
curl http://localhost:3000/api/health

# Simple uptime check
curl -I http://localhost:3000/api/health
```

## Error Messages and Troubleshooting

### Common Error: Missing Environment Variables

```
❌ Environment variable validation failed:

NEXT_PUBLIC_SUPABASE_URL: Required
SUPABASE_SERVICE_ROLE_KEY: Required

Please check your .env.local file and ensure all required variables are set.
See .env.local.example for the expected format.
```

**Solution:**
1. Copy `.env.local.example` to `.env.local`
2. Fill in all required values from your Supabase project
3. Restart the application

### Common Error: Invalid URL Format

```
❌ Environment variable validation failed:

NEXT_PUBLIC_SUPABASE_URL: NEXT_PUBLIC_SUPABASE_URL must be a Supabase URL
```

**Solution:**
- Ensure the URL follows the format: `https://your-project-ref.supabase.co`
- Check for typos in the project reference
- Verify the URL in your Supabase dashboard

### Common Error: Invalid JWT Token

```
❌ Environment variable validation failed:

NEXT_PUBLIC_SUPABASE_ANON_KEY: NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT token
```

**Solution:**
- Copy the key exactly from Supabase dashboard
- Ensure no extra spaces or characters
- Verify you're using the correct key type (anon vs service_role)

### Script-Specific Errors

When running database scripts (`npm run seed`):

```
❌ Missing required environment variables:
   NEXT_PUBLIC_SUPABASE_URL: true
   SUPABASE_SERVICE_ROLE_KEY: false

💡 Make sure your .env.local file contains:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Solution:**
- Ensure `.env.local` exists in the project root
- Add the missing `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard
- The service role key bypasses RLS and is required for seeding

## Development vs Production

### Development Mode
- Shows detailed error messages
- Includes debug information in health checks
- Logs validation success to console
- Non-fatal validation errors (warnings only)

### Production Mode
- Minimal error exposure
- Health checks exclude sensitive information
- Fatal validation errors (process exits)
- Enhanced security validation

## Integration with Supabase Clients

All Supabase clients now use validated environment variables:

```typescript
// Before (unsafe)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,  // Could be undefined!
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Could be invalid!
)

// After (safe)
import { supabaseConfig } from '@/lib/config'
const supabase = createClient(
  supabaseConfig.url,      // ✅ Validated at startup
  supabaseConfig.anonKey   // ✅ Validated at startup
)
```

## Feature Flags

Environment validation includes feature flag support:

```typescript
import { isFeatureEnabled } from '@/lib/config'

if (isFeatureEnabled('FEATURE_AUDIT_LOGS')) {
  // Audit logging is enabled
}
```

Available feature flags:
- `FEATURE_AUDIT_LOGS` - Enable audit logging (default: true)
- `FEATURE_DOCUMENT_INTELLIGENCE` - Enable document AI features (default: true)
- `FEATURE_EMAIL_TEMPLATES` - Enable email template system (default: true)

## Monitoring and Alerting

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "version": "2.1.0",
  "uptime": 3600,
  "checks": {
    "environment": {
      "supabaseUrl": true,
      "supabaseAnonKey": true,
      "supabaseServiceKey": true
    },
    "features": {
      "auditLogs": true,
      "documentIntelligence": true,
      "emailTemplates": true
    },
    "database": {
      "configured": true
    }
  }
}
```

### Monitoring Setup

1. **Uptime Monitoring**: Use `HEAD /api/health` for simple uptime checks
2. **Configuration Monitoring**: Use `GET /api/health` to verify environment
3. **Alerting**: Set up alerts when health status is not "healthy"

## Best Practices

### 1. Environment File Management
- Never commit `.env.local` to version control
- Keep `.env.local.example` updated with all required variables
- Use different Supabase projects for different environments

### 2. Key Security
- Rotate Supabase keys regularly
- Use service role key only in server-side code
- Monitor key usage in Supabase dashboard

### 3. Deployment
- Validate environment in CI/CD pipeline
- Use health checks in deployment verification
- Set up monitoring alerts for production

### 4. Local Development
- Copy `.env.local.example` for new developers
- Document any additional setup requirements
- Use consistent naming for environment variables

## Troubleshooting Checklist

When experiencing environment-related issues:

- [ ] `.env.local` file exists in project root
- [ ] All required variables are present
- [ ] URLs use correct format (https://project-ref.supabase.co)
- [ ] JWT tokens are complete and unmodified
- [ ] No extra spaces or special characters
- [ ] Supabase project is active and accessible
- [ ] Service role key has appropriate permissions
- [ ] Application has been restarted after changes
- [ ] Health check endpoint returns 200 status

## Related Documentation

- [Getting Started Guide](./GETTING_STARTED.md) - Initial setup
- [Deployment Guide](./DEPLOYMENT.md) - Production configuration
- [Security Guide](./SECURITY.md) - Security best practices
- [Configuration Guide](./CONFIGURATION.md) - Advanced configuration