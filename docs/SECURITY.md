# OrbitABM Security Model

This document outlines the comprehensive security implementation for OrbitABM, including Row Level Security (RLS) policies, authentication requirements, and data access controls.

## Overview

OrbitABM implements a multi-layered security model based on:
- **Supabase Authentication**: Email/password authentication with JWT tokens
- **Row Level Security (RLS)**: Database-level access control policies
- **Organization-based Isolation**: Multi-tenant data segregation
- **Role-based Access Control**: User roles with different permission levels

## Security Architecture

### 1. Authentication Layer
- **Supabase Auth**: Handles user registration, login, and session management
- **JWT Tokens**: Secure session tokens with automatic refresh
- **Email Verification**: Required account activation
- **Password Reset**: Secure password recovery workflow

### 2. Authorization Layer
- **Row Level Security**: PostgreSQL RLS policies enforce data access rules
- **Organization Isolation**: Users can only access data from their organization
- **Role-based Permissions**: Different access levels based on user roles

### 3. Data Protection Layer
- **Encrypted Storage**: All data encrypted at rest
- **Secure Transmission**: HTTPS/TLS for all communications
- **Input Validation**: Server-side validation and sanitization
- **SQL Injection Prevention**: Parameterized queries and RLS policies

## User Roles and Permissions

### Admin Role
- **Full Organization Access**: Can manage all data within their organization
- **User Management**: Can create, update, and manage user profiles
- **Organization Management**: Can update organization settings
- **Data Management**: Full CRUD access to all organization data

### Manager Role
- **Data Management**: Can create, read, update organization data
- **Template Management**: Can manage playbook templates and document templates
- **Campaign Management**: Full access to campaigns and activities
- **Limited User Access**: Can view but not manage other users

### Viewer Role
- **Read-Only Access**: Can view all organization data
- **No Management**: Cannot create, update, or delete data
- **Profile Management**: Can only update their own profile

## Row Level Security Policies

### Organization-Scoped Tables

All organization-scoped tables implement the following policy pattern:

#### View Policy
```sql
CREATE POLICY "Users can view [table] in their organization"
ON [table] FOR SELECT
USING (organization_id = get_user_organization_id());
```

#### Management Policy (Admin/Manager)
```sql
CREATE POLICY "Managers can manage [table] in their organization"
ON [table] FOR ALL
USING (can_manage_organization(organization_id))
WITH CHECK (organization_id = get_user_organization_id());
```

### Tables with Organization-Scoped RLS

#### Core Tables
- **organizations**: Organization management with role-based access
- **profiles**: User profiles with self-management and admin oversight
- **verticals**: Organization-specific verticals
- **companies**: Company data scoped to organization
- **contacts**: Contact information scoped to organization
- **pe_acquisitions**: PE acquisition data scoped to organization
- **digital_snapshots**: Digital presence data scoped to organization

#### Campaign Tables
- **playbook_templates**: Template management scoped to organization
- **playbook_steps**: Steps linked to organization templates
- **campaigns**: Campaign data scoped to organization
- **campaign_competitors**: Competitors linked to organization campaigns
- **activities**: Activities linked to organization campaigns
- **assets**: Assets linked to organization campaigns
- **results**: Results linked to organization campaigns

#### Document Intelligence Tables
- **document_templates**: Document templates scoped to organization
- **generated_documents**: Generated documents scoped to organization
- **email_templates**: Email templates scoped to organization

### Shared Reference Tables

Some tables are shared across organizations with read-only access:

#### Markets Table
```sql
CREATE POLICY "Authenticated users can view markets"
ON markets FOR SELECT
USING (auth.role() = 'authenticated');
```

#### PE Platforms Table
```sql
CREATE POLICY "Authenticated users can view pe_platforms"
ON pe_platforms FOR SELECT
USING (auth.role() = 'authenticated');
```

## Security Helper Functions

All security helper functions use explicit `search_path` settings to prevent search path injection attacks.

### get_user_organization_id()
Returns the organization ID for the current authenticated user.

```sql
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE id = auth.uid()
$$;
```

### is_user_admin()
Checks if the current user has admin role.

```sql
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role = 'admin'
  FROM profiles 
  WHERE id = auth.uid()
$$;
```

### can_manage_organization(org_id)
Checks if the current user can manage a specific organization.

```sql
CREATE OR REPLACE FUNCTION can_manage_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role IN ('admin', 'manager')
  )
$$;
```

### update_updated_at_column()
Trigger function to automatically update `updated_at` timestamps.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
```

**Security Note**: All functions use `SET search_path = public` to prevent search path injection attacks where malicious users could potentially execute unintended code by manipulating the search path.

## API Security

### Authentication Middleware
All API routes require authentication:

```typescript
const { data: { session }, error: authError } = await supabase.auth.getSession()
if (authError || !session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Organization Context
API routes automatically filter data by user's organization through RLS policies.

### Input Validation
- Server-side validation for all inputs
- Type checking with TypeScript
- SQL injection prevention through parameterized queries

## Data Access Patterns

### Organization Isolation
```typescript
// All queries automatically filtered by RLS
const { data: companies } = await supabase
  .from('companies')
  .select('*') // Only returns user's organization data
```

### Cross-Organization Data
```typescript
// Reference data accessible to all authenticated users
const { data: markets } = await supabase
  .from('markets')
  .select('*') // Returns all markets (shared reference data)
```

### Role-Based Access
```typescript
// Admin/Manager operations automatically enforced
const { data, error } = await supabase
  .from('playbook_templates')
  .insert(templateData) // Only succeeds if user can manage organization
```

## Security Views

### company_latest_snapshot
Provides latest digital snapshot data with organization filtering:
- Automatically filtered by RLS policies
- No SECURITY DEFINER (follows user permissions)
- Optimized for performance with proper indexing

### active_campaigns_summary
Provides campaign summary data with organization filtering:
- Automatically filtered by RLS policies
- Includes activity and result counts
- Scoped to active and planned campaigns only

## Security Monitoring

### Audit Trail
- All data changes tracked with timestamps
- User identification through auth.uid()
- Organization context preserved in all operations

### Access Logging
- Authentication events logged by Supabase
- Failed access attempts tracked
- Session management with automatic expiry

## Security Best Practices

### For Developers

1. **Always Use RLS**: Never bypass RLS policies in application code
2. **Validate Inputs**: Server-side validation for all user inputs
3. **Use Parameterized Queries**: Prevent SQL injection attacks
4. **Check Permissions**: Verify user permissions before sensitive operations
5. **Audit Changes**: Log all data modifications with user context

### For Administrators

1. **Regular Security Reviews**: Periodically review RLS policies and access patterns
2. **User Management**: Regularly audit user roles and permissions
3. **Monitor Access**: Review authentication logs and access patterns
4. **Update Dependencies**: Keep Supabase and application dependencies updated
5. **Backup Strategy**: Ensure secure, encrypted backups

## Compliance and Standards

### Data Protection
- **GDPR Compliance**: User data protection and privacy rights
- **Data Minimization**: Only collect and store necessary data
- **Right to Deletion**: Support for data deletion requests
- **Data Portability**: Export capabilities for user data

### Security Standards
- **OWASP Guidelines**: Following web application security best practices
- **Encryption**: Data encrypted at rest and in transit
- **Access Controls**: Principle of least privilege
- **Regular Updates**: Security patches and dependency updates

## Incident Response

### Security Incident Procedures

1. **Immediate Response**
   - Identify and contain the security incident
   - Assess the scope and impact
   - Notify relevant stakeholders

2. **Investigation**
   - Analyze logs and access patterns
   - Identify root cause and attack vectors
   - Document findings and evidence

3. **Remediation**
   - Apply security patches or fixes
   - Update RLS policies if necessary
   - Strengthen affected security controls

4. **Recovery**
   - Restore services and data if needed
   - Verify security controls are working
   - Monitor for additional threats

5. **Post-Incident**
   - Conduct post-incident review
   - Update security procedures
   - Implement additional safeguards

## Testing Security

### RLS Policy Testing
```sql
-- Test as different users
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid", "role": "authenticated"}';

-- Verify organization isolation
SELECT * FROM companies; -- Should only return user's org data
```

### API Security Testing
```bash
# Test unauthorized access
curl -H "Authorization: Bearer invalid-token" http://localhost:3000/api/organizations

# Test organization isolation
curl -H "Authorization: Bearer user1-token" http://localhost:3000/api/companies
curl -H "Authorization: Bearer user2-token" http://localhost:3000/api/companies
```

### Automated Security Tests
- Unit tests for RLS policies
- Integration tests for API security
- End-to-end tests for authentication flows
- Penetration testing for security vulnerabilities

## Security Configuration

### Environment Variables
```bash
# Required for security
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # Server-side only
```

### Supabase Configuration
- Enable RLS on all tables
- Configure authentication providers
- Set up email templates for auth flows
- Configure CORS and allowed origins

### Next.js Security Headers
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]
```

## Troubleshooting Security Issues

### Common RLS Issues

1. **Access Denied Errors**
   - Check user's organization assignment
   - Verify RLS policies are correctly applied
   - Ensure helper functions are working

2. **Cross-Organization Data Leakage**
   - Review RLS policy conditions
   - Test with different user contexts
   - Verify organization_id filtering

3. **Performance Issues**
   - Check RLS policy efficiency
   - Ensure proper indexing for policy conditions
   - Monitor query execution plans

### Authentication Issues

1. **Login Failures**
   - Check Supabase auth configuration
   - Verify email verification settings
   - Review CORS configuration

2. **Session Management**
   - Check JWT token expiry settings
   - Verify refresh token handling
   - Monitor session storage

## Security Changelog

### Version 6.0 (Current)
- ✅ **FINAL FIX**: Completely resolved function search path mutable warnings
- ✅ Recreated all functions with explicit `SET search_path = public`
- ✅ Rebuilt all RLS policies and triggers from scratch
- ✅ Verified complete database security with comprehensive testing
- ✅ Confirmed zero linter warnings or errors
- ✅ All 17 tables, 2 views, and 4 functions fully secured

### Version 5.0
- ✅ Fixed function search path security issues
- ✅ Added explicit search_path to all functions
- ✅ Secured trigger functions against injection attacks
- ✅ Enhanced function security documentation

### Version 4.0
- ✅ Fixed SECURITY DEFINER views completely
- ✅ Recreated views without permission bypass
- ✅ Added proper view security documentation

### Version 3.0
- ✅ Enabled RLS on all 21 tables
- ✅ Created comprehensive RLS policies
- ✅ Fixed SECURITY DEFINER views
- ✅ Added organization isolation
- ✅ Implemented role-based access control

### Version 2.0
- ✅ Added document intelligence tables
- ✅ Extended campaign and contact models
- ✅ Added email templates and document generation

### Version 1.0
- ✅ Initial schema with basic tables
- ✅ Organization and user management
- ✅ Campaign and activity tracking

## Future Security Enhancements

- **Multi-Factor Authentication**: SMS/TOTP-based 2FA
- **API Rate Limiting**: Prevent abuse and DoS attacks
- **Advanced Audit Logging**: Detailed activity tracking
- **Data Loss Prevention**: Automated data protection
- **Security Scanning**: Automated vulnerability detection
- **Compliance Reporting**: Automated compliance checks