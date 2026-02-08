# Security Headers Implementation

OrbitABM implements comprehensive security headers to protect against various web security vulnerabilities including XSS, CSRF, clickjacking, and other common attacks.

## Overview

The security implementation includes:
- ✅ **Content Security Policy (CSP)** - Prevents XSS attacks
- ✅ **CSRF Protection** - Prevents cross-site request forgery
- ✅ **Rate Limiting** - Prevents abuse and DoS attacks
- ✅ **Security Headers** - Multiple layers of protection
- ✅ **Input Sanitization** - Prevents injection attacks
- ✅ **Secure File Uploads** - Validates and restricts file types

## Security Headers Configuration

### 1. Content Security Policy (CSP)

```typescript
// Implemented in next.config.ts
"Content-Security-Policy": [
  "default-src 'self'",                    // Only allow same-origin by default
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",     // Allow images from various sources
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'none'",                      // Prevent embedding in frames
  "object-src 'none'",                     // Block plugins
  "base-uri 'self'",                       // Restrict base tag
  "form-action 'self'",                    // Restrict form submissions
  "frame-ancestors 'none'",                // Prevent clickjacking
  "upgrade-insecure-requests"              // Force HTTPS
].join('; ')
```

**Protection Against:**
- Cross-Site Scripting (XSS) attacks
- Code injection attacks
- Clickjacking attacks
- Data exfiltration

### 2. HTTP Strict Transport Security (HSTS)

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload'
}
```

**Protection Against:**
- Man-in-the-middle attacks
- Protocol downgrade attacks
- Cookie hijacking over HTTP

### 3. X-Frame-Options

```typescript
{
  key: 'X-Frame-Options',
  value: 'DENY'
}
```

**Protection Against:**
- Clickjacking attacks
- UI redressing attacks

### 4. X-Content-Type-Options

```typescript
{
  key: 'X-Content-Type-Options',
  value: 'nosniff'
}
```

**Protection Against:**
- MIME type confusion attacks
- Content sniffing vulnerabilities

### 5. X-XSS-Protection

```typescript
{
  key: 'X-XSS-Protection',
  value: '1; mode=block'
}
```

**Protection Against:**
- Reflected XSS attacks (legacy browsers)

### 6. Referrer Policy

```typescript
{
  key: 'Referrer-Policy',
  value: 'origin-when-cross-origin'
}
```

**Protection Against:**
- Information leakage through referrer headers

### 7. Permissions Policy

```typescript
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
}
```

**Protection Against:**
- Unauthorized access to device features
- Privacy violations

## CSRF Protection

### Implementation

CSRF protection uses the double-submit cookie pattern:

```typescript
// Server-side token generation
const csrfToken = generateCSRFToken()
response.cookies.set('__csrf-token', csrfToken, {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24, // 24 hours
})
```

```typescript
// Client-side token validation
const token = csrfClient.getToken()
headers['x-csrf-token'] = token
```

### Usage in React Components

```typescript
import { useSecurity } from '@/lib/hooks/useSecurity'

function MyComponent() {
  const { secureFetch, csrfToken } = useSecurity()
  
  const handleSubmit = async (data) => {
    const response = await secureFetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}
```

### Protected Operations

CSRF protection is applied to:
- ✅ All state-changing HTTP methods (POST, PUT, PATCH, DELETE)
- ✅ Form submissions
- ✅ AJAX requests
- ✅ File uploads

### Exemptions

CSRF validation is skipped for:
- ✅ Safe HTTP methods (GET, HEAD, OPTIONS)
- ✅ API routes with proper authentication
- ✅ Public endpoints (health checks)

## Rate Limiting

### Configuration

Different rate limits for different endpoint types:

```typescript
export const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,            // 5 attempts per window
  },
  api: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,          // 100 requests per minute
  },
  upload: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 uploads per minute
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,            // 3 attempts per hour
  },
}
```

### Implementation

Rate limiting uses a sliding window algorithm:

```typescript
// Middleware automatically applies appropriate limits
export function rateLimitMiddleware(request: NextRequest, config: RateLimitConfig) {
  const result = rateLimit(request, config)
  
  if (!result.allowed) {
    return NextResponse.json({
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    }, { status: 429 })
  }
}
```

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200000
Retry-After: 60
```

## Input Sanitization

### HTML Sanitization

```typescript
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}
```

### Input Validation

```typescript
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>'"&]/g, '')           // Remove HTML/script chars
    .replace(/[\x00-\x1F\x7F]/g, '')   // Remove control characters
    .trim()
    .slice(0, 1000)                    // Limit length
}
```

### Client-Side Usage

```typescript
import { useSecurity } from '@/lib/hooks/useSecurity'

function MyForm() {
  const { sanitizeHtml, validateEmail } = useSecurity()
  
  const handleInput = (value: string) => {
    const sanitized = sanitizeHtml(value)
    // Use sanitized value
  }
}
```

## File Upload Security

### Validation Rules

```typescript
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Allowed file types
  const allowedTypes = [
    'text/csv',
    'application/json',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]
  
  // Size limit: 10MB
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size too large (max 10MB)' }
  }
  
  // Type validation
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' }
  }
  
  return { valid: true }
}
```

### Blocked Extensions

The following file extensions are blocked to prevent executable uploads:

- `.exe`, `.bat`, `.cmd`, `.com`, `.scr`, `.pif`
- `.js`, `.vbs`, `.jar`, `.php`, `.asp`, `.jsp`

## Security Monitoring

### Incident Reporting

Client-side security incidents are automatically reported:

```typescript
// Automatic reporting
const { reportSecurityIncident } = useSecurity()

await reportSecurityIncident({
  type: 'xss_attempt',
  details: { suspiciousInput: userInput }
})
```

### Security Logging

All security events are logged with details:

```typescript
logSecurityEvent({
  type: 'rate_limit_exceeded',
  ip: clientIP,
  userAgent: userAgent,
  path: requestPath,
  details: { limit: 100, attempts: 150 }
})
```

### Monitoring Endpoints

- **`GET /api/security/report`** - Security incident statistics (admin only)
- **`GET /api/health`** - System health including security status

## Production Considerations

### HTTPS Enforcement

```typescript
// Automatic HTTPS redirect in production
async redirects() {
  return process.env.NODE_ENV === 'production' ? [
    {
      source: '/:path*',
      has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
      destination: 'https://:host/:path*',
      permanent: true,
    },
  ] : []
}
```

### Security Headers in Production

All security headers are automatically applied in production with stricter settings:

- HSTS with preload
- Strict CSP policies
- Secure cookie settings
- HTTPS-only redirects

### Environment-Specific Settings

```typescript
const securityConfig = {
  session: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  csrf: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}
```

## Testing Security Headers

### Browser Developer Tools

1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Click on the main document request
5. Check Response Headers section

### Online Tools

- **Security Headers**: https://securityheaders.com/
- **Mozilla Observatory**: https://observatory.mozilla.org/
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/

### Expected Headers

A properly configured response should include:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'...
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()...
```

## Troubleshooting

### Common Issues

1. **CSP Violations**
   - Check browser console for CSP errors
   - Adjust CSP policy if legitimate resources are blocked
   - Use `report-uri` directive for monitoring

2. **CSRF Token Mismatches**
   - Ensure tokens are properly set in cookies
   - Verify token is included in request headers
   - Check token expiration times

3. **Rate Limit False Positives**
   - Review rate limit configurations
   - Consider IP whitelisting for trusted sources
   - Implement user-based rate limiting

### Debug Mode

Enable debug logging in development:

```bash
DEBUG=true npm run dev
```

This will log security events and help identify issues.

## Security Checklist

### Implementation Checklist

- ✅ Security headers configured in `next.config.ts`
- ✅ CSRF protection implemented and tested
- ✅ Rate limiting configured for all endpoint types
- ✅ Input sanitization applied to user inputs
- ✅ File upload validation implemented
- ✅ Security incident reporting system active
- ✅ HTTPS enforcement in production
- ✅ Security monitoring and logging enabled

### Testing Checklist

- ✅ Verify all security headers are present
- ✅ Test CSRF protection on forms and API calls
- ✅ Confirm rate limiting works correctly
- ✅ Validate input sanitization prevents XSS
- ✅ Test file upload restrictions
- ✅ Verify HTTPS redirects work in production
- ✅ Check security incident reporting functionality

## Related Documentation

- [Security Model](./SECURITY.md) - Overall security architecture
- [Authentication System](./AUTHENTICATION.md) - User authentication
- [Environment Validation](./ENVIRONMENT_VALIDATION.md) - Configuration security
- [API Documentation](./API.md) - API security considerations