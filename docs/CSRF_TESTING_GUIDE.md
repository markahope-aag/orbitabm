# CSRF Protection Testing Guide

This guide provides comprehensive instructions for testing the CSRF (Cross-Site Request Forgery) protection implementation in OrbitABM.

## Overview

OrbitABM implements CSRF protection using the **double-submit cookie pattern**, which provides robust protection against CSRF attacks without requiring server-side session storage.

## CSRF Protection Components

### 1. Server-Side Protection
- **Token Generation**: Cryptographically secure tokens generated per session
- **Token Validation**: Double-submit cookie pattern validation
- **API Route Protection**: Automatic CSRF validation for state-changing operations
- **Security Logging**: Comprehensive logging of CSRF violations

### 2. Client-Side Integration
- **Automatic Token Management**: Tokens automatically included in requests
- **React Hooks**: `useSecurity`, `useSecureApi`, `useSecureForm` for easy integration
- **Form Protection**: Automatic CSRF token inclusion in form submissions
- **Error Handling**: Clear error messages for CSRF validation failures

## Testing Scenarios

### 1. Valid CSRF Token Test

**Objective**: Verify that requests with valid CSRF tokens are accepted.

**Steps**:
1. Open the application in a browser
2. Open Developer Tools (F12) → Network tab
3. Submit a form or make a state-changing API call
4. Verify the request includes:
   - `x-csrf-token` header with the token value
   - `__csrf-token` cookie with the same token value
5. Verify the response is successful (200/201 status)

**Expected Result**: Request succeeds with proper CSRF token validation.

### 2. Missing CSRF Token Test

**Objective**: Verify that requests without CSRF tokens are rejected.

**Steps**:
1. Open Developer Tools → Console
2. Execute a manual fetch request without CSRF token:
```javascript
fetch('/api/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test Org', type: 'client' })
})
.then(r => r.json())
.then(console.log)
```
3. Check the response

**Expected Result**: 
- Response status: 403 Forbidden
- Response body: `{ "error": "CSRF validation failed", "details": "CSRF token missing from request headers..." }`

### 3. Invalid CSRF Token Test

**Objective**: Verify that requests with invalid CSRF tokens are rejected.

**Steps**:
1. Open Developer Tools → Console
2. Execute a fetch request with an invalid token:
```javascript
fetch('/api/organizations', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-csrf-token': 'invalid-token-12345'
  },
  body: JSON.stringify({ name: 'Test Org', type: 'client' })
})
.then(r => r.json())
.then(console.log)
```

**Expected Result**:
- Response status: 403 Forbidden
- Response body: `{ "error": "CSRF validation failed", "details": "CSRF token mismatch..." }`

### 4. Safe HTTP Methods Test

**Objective**: Verify that safe HTTP methods (GET, HEAD, OPTIONS) don't require CSRF tokens.

**Steps**:
1. Make GET requests without CSRF tokens:
```javascript
fetch('/api/organizations', { method: 'GET' })
.then(r => r.json())
.then(console.log)
```

**Expected Result**: Request succeeds without CSRF token (GET is a safe method).

### 5. Cross-Origin Request Test

**Objective**: Simulate a CSRF attack from a malicious website.

**Steps**:
1. Create a simple HTML file on a different domain/port:
```html
<!DOCTYPE html>
<html>
<body>
<form action="http://localhost:3000/api/organizations" method="POST">
  <input type="hidden" name="name" value="Malicious Org">
  <input type="hidden" name="type" value="client">
  <input type="submit" value="Attack">
</form>
<script>
// Attempt to make AJAX request (will fail due to CORS)
fetch('http://localhost:3000/api/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Attack Org', type: 'client' })
})
.catch(console.error)
</script>
</body>
</html>
```
2. Open this file in a browser
3. Try to submit the form or execute the script

**Expected Result**: 
- Form submission fails due to missing CSRF token
- AJAX request fails due to CORS policy
- No organization is created

### 6. Token Expiration Test

**Objective**: Verify that expired CSRF tokens are handled properly.

**Steps**:
1. Get a CSRF token from the application
2. Wait for the token to expire (24 hours by default)
3. Try to use the expired token in a request

**Expected Result**: Request fails with CSRF validation error, new token is generated.

### 7. React Hook Integration Test

**Objective**: Test the React hooks for CSRF protection.

**Steps**:
1. Use the `CSRFProtectedForm` component (created above)
2. Fill out and submit the form
3. Verify the form submission works correctly
4. Check that the security status shows CSRF token is present

**Expected Result**: Form submits successfully with automatic CSRF protection.

## Automated Testing

### Unit Tests

Create unit tests for CSRF utilities:

```typescript
// tests/csrf.test.ts
import { generateCSRFToken, validateCSRFToken } from '@/lib/security/csrf'
import { NextRequest } from 'next/server'

describe('CSRF Protection', () => {
  test('generates valid CSRF token', () => {
    const token = generateCSRFToken()
    expect(token).toHaveLength(64) // 32 bytes * 2 (hex)
    expect(token).toMatch(/^[a-f0-9]+$/)
  })

  test('validates matching tokens', () => {
    const token = generateCSRFToken()
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': token },
      cookies: { '__csrf-token': token }
    })
    
    expect(validateCSRFToken(request)).toBe(true)
  })

  test('rejects mismatched tokens', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': 'token1' },
      cookies: { '__csrf-token': 'token2' }
    })
    
    expect(validateCSRFToken(request)).toBe(false)
  })

  test('allows safe HTTP methods without token', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET'
    })
    
    expect(validateCSRFToken(request)).toBe(true)
  })
})
```

### Integration Tests

Test API routes with CSRF protection:

```typescript
// tests/api/organizations.test.ts
import { POST } from '@/app/api/organizations/route'
import { NextRequest } from 'next/server'

describe('/api/organizations', () => {
  test('rejects POST without CSRF token', async () => {
    const request = new NextRequest('http://localhost:3000/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', type: 'client' })
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
    
    const data = await response.json()
    expect(data.error).toBe('CSRF validation failed')
  })

  test('accepts POST with valid CSRF token', async () => {
    const token = 'valid-test-token'
    const request = new NextRequest('http://localhost:3000/api/organizations', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-csrf-token': token
      },
      cookies: { '__csrf-token': token },
      body: JSON.stringify({ name: 'Test', type: 'client' })
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
```

## Security Event Monitoring

### Checking CSRF Violation Logs

1. **Server Logs**: Check console output for CSRF violations:
```
[SECURITY] csrf_violation: {
  timestamp: "2024-01-15T10:30:00.000Z",
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  path: "/api/organizations",
  details: { method: "POST", error: "CSRF token missing..." }
}
```

2. **Database Logs**: Check audit_logs table for security incidents:
```sql
SELECT * FROM audit_logs 
WHERE action = 'security_incident' 
AND new_values->>'incident_type' = 'csrf_violation'
ORDER BY created_at DESC;
```

3. **Security Report API**: Use the security reporting endpoint:
```javascript
fetch('/api/security/report')
.then(r => r.json())
.then(data => console.log(data.statistics))
```

## Common Issues and Troubleshooting

### Issue 1: CSRF Token Not Found

**Symptoms**: Forms show "CSRF token not available" message

**Causes**:
- Cookies are disabled
- JavaScript is disabled
- Token generation failed

**Solutions**:
1. Enable cookies in browser
2. Refresh the page to generate new token
3. Check browser console for errors

### Issue 2: Token Mismatch Errors

**Symptoms**: 403 errors with "CSRF token mismatch" message

**Causes**:
- Multiple browser tabs with different tokens
- Token corruption during transmission
- Clock skew between client and server

**Solutions**:
1. Close other tabs and refresh
2. Clear cookies and restart session
3. Check for browser extensions interfering

### Issue 3: API Calls Failing

**Symptoms**: All POST/PUT/PATCH requests return 403

**Causes**:
- CSRF middleware not properly configured
- Token not being included in requests
- API route not using security wrapper

**Solutions**:
1. Verify middleware configuration
2. Use `useSecurity` hook for API calls
3. Ensure API routes use `withSecurity` wrapper

## Performance Considerations

### Token Storage

- **Memory Usage**: CSRF tokens are stored in memory (cookies)
- **Storage Size**: Each token is 64 characters (32 bytes hex)
- **Cleanup**: Tokens automatically expire after 24 hours

### Validation Performance

- **Hash Comparison**: Uses SHA-256 hashing for secure comparison
- **Timing Attack Protection**: Constant-time comparison prevents timing attacks
- **Minimal Overhead**: Validation adds ~1ms per request

## Security Best Practices

### 1. Token Rotation
- Tokens are generated per session
- New tokens issued on authentication
- Expired tokens automatically cleaned up

### 2. Secure Transmission
- Tokens transmitted over HTTPS only in production
- SameSite=Strict cookie attribute
- HttpOnly=false (required for JavaScript access)

### 3. Error Handling
- Generic error messages to prevent information disclosure
- Detailed logging for security monitoring
- Graceful fallback for token generation failures

## Compliance and Standards

### OWASP Guidelines
- Implements OWASP CSRF prevention recommendations
- Uses cryptographically secure random tokens
- Validates tokens on all state-changing operations

### Security Headers
- Works with Content Security Policy (CSP)
- Compatible with CORS policies
- Integrates with other security headers

## Testing Checklist

- [ ] Valid CSRF token requests succeed
- [ ] Missing CSRF token requests are rejected (403)
- [ ] Invalid CSRF token requests are rejected (403)
- [ ] Safe HTTP methods work without tokens
- [ ] Cross-origin requests are blocked
- [ ] React hooks integrate properly
- [ ] Security events are logged correctly
- [ ] Token expiration is handled gracefully
- [ ] Performance impact is minimal
- [ ] Error messages are appropriate

## Conclusion

The CSRF protection implementation in OrbitABM provides comprehensive security against cross-site request forgery attacks while maintaining usability and performance. Regular testing using the scenarios above ensures the protection remains effective and properly integrated throughout the application.