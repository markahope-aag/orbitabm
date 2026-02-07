# OrbitABM Troubleshooting Guide

Common issues, solutions, and debugging procedures for OrbitABM.

## 🚨 Quick Fixes

### Application Won't Start

**Symptoms:**
- `npm run dev` fails
- Build errors
- Module not found errors

**Solutions:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build

# Check Node.js version
node --version  # Should be 18+
```

### Database Connection Issues

**Symptoms:**
- "Failed to connect to database"
- Supabase client errors
- Empty data tables

**Check Environment Variables:**
```bash
# Verify .env.local exists and has correct values
cat .env.local

# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "YOUR_SUPABASE_URL/rest/v1/organizations"
```

**Common Fixes:**
1. Verify Supabase URL format: `https://project.supabase.co`
2. Check API key format (starts with `eyJ`)
3. Ensure database migration was run
4. Verify Supabase project is active

### Import/Export Failures

**Symptoms:**
- CSV upload fails
- Export downloads empty files
- Column mapping errors

**Debug Steps:**
```bash
# Check file format
file your-file.csv
head -5 your-file.csv

# Verify CSV structure
npm run validate-csv your-file.csv
```

**Common Issues:**
- File encoding (use UTF-8)
- Missing required columns
- Incorrect date formats
- Special characters in data

## 🔍 Error Messages

### TypeScript Errors

**"Property 'X' does not exist on type 'Y'"**
```bash
# Check type definitions
cat src/lib/types/database.ts | grep -A 5 "interface.*Row"

# Regenerate types if needed
npm run generate-types
```

**"Module not found"**
```bash
# Check import paths
# Correct: import { ... } from '@/lib/...'
# Wrong: import { ... } from '../../../lib/...'

# Verify tsconfig paths
cat tsconfig.json | grep -A 10 "paths"
```

### Runtime Errors

**"Organization not found"**
```typescript
// Check organization context
const { currentOrgId } = useOrg()
console.log('Current org:', currentOrgId)

// Verify organization exists in database
SELECT * FROM organizations WHERE id = 'your-org-id';
```

**"Failed to fetch"**
```typescript
// Check API route exists
ls src/app/api/

// Test API endpoint directly
curl http://localhost:3000/api/companies?organization_id=uuid
```

### Database Errors

**"relation does not exist"**
```sql
-- Check if migration was run
\dt public.*

-- Run migration if missing
-- Copy contents of supabase/migrations/001_initial_schema.sql
-- Execute in Supabase SQL Editor
```

**"permission denied"**
```sql
-- Check RLS policies (if enabled)
SELECT * FROM pg_policies WHERE tablename = 'companies';

-- Temporarily disable RLS for debugging
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
```

## 🐛 Debugging Procedures

### Frontend Debugging

**Enable Debug Mode:**
```typescript
// Add to .env.local
NEXT_PUBLIC_DEBUG=true

// Use in components
if (process.env.NEXT_PUBLIC_DEBUG) {
  console.log('Debug info:', data)
}
```

**React Developer Tools:**
1. Install React DevTools browser extension
2. Check component state and props
3. Monitor context values
4. Track re-renders

**Network Debugging:**
1. Open browser DevTools → Network tab
2. Filter by XHR/Fetch requests
3. Check request/response data
4. Verify API endpoints

### Backend Debugging

**API Route Debugging:**
```typescript
// Add logging to API routes
console.log('Request:', request.method, request.url)
console.log('Body:', await request.json())

// Check Supabase queries
const { data, error } = await supabase.from('companies').select('*')
console.log('Supabase response:', { data, error })
```

**Database Query Debugging:**
```sql
-- Enable query logging in Supabase
-- Go to Settings → Database → Query Performance
-- Monitor slow queries

-- Manual query testing
SELECT * FROM companies 
WHERE organization_id = 'your-org-id' 
LIMIT 5;
```

### Performance Debugging

**Slow Page Loads:**
```bash
# Analyze bundle size
npm run analyze

# Check for large dependencies
npm ls --depth=0

# Monitor Core Web Vitals
# Use Lighthouse in Chrome DevTools
```

**Database Performance:**
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM companies 
WHERE organization_id = 'uuid' AND status = 'prospect';

-- Monitor active queries
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active';
```

## 📊 Data Issues

### Missing Data

**Empty Tables After Seeding:**
```bash
# Check seeding output
npm run seed 2>&1 | tee seed.log

# Verify data exists
echo "SELECT count(*) FROM organizations;" | psql "your-db-url"
```

**Incorrect Data Relationships:**
```sql
-- Check foreign key constraints
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';
```

### Data Corruption

**Inconsistent States:**
```sql
-- Find orphaned records
SELECT c.* FROM companies c 
LEFT JOIN organizations o ON c.organization_id = o.id 
WHERE o.id IS NULL;

-- Fix orphaned records
DELETE FROM companies 
WHERE organization_id NOT IN (SELECT id FROM organizations);
```

**Duplicate Data:**
```sql
-- Find duplicates
SELECT name, organization_id, count(*) 
FROM companies 
GROUP BY name, organization_id 
HAVING count(*) > 1;

-- Remove duplicates (keep oldest)
DELETE FROM companies 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM companies 
  GROUP BY name, organization_id
);
```

## 🔧 Configuration Issues

### Environment Variables

**Missing Variables:**
```bash
# Check required variables
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Missing: $var"
  fi
done
```

**Invalid Format:**
```bash
# Validate Supabase URL
if [[ $NEXT_PUBLIC_SUPABASE_URL =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; then
  echo "Valid URL"
else
  echo "Invalid URL format"
fi
```

### Build Issues

**Build Failures:**
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Common fixes
rm -rf .next node_modules
npm install
npm run build
```

**Type Errors in Build:**
```bash
# Run type check separately
npx tsc --noEmit

# Skip type checking in build (temporary)
# Add to next.config.js:
# typescript: { ignoreBuildErrors: true }
```

## 🚀 Performance Issues

### Slow Queries

**Identify Slow Queries:**
```sql
-- Enable slow query logging
-- In Supabase: Settings → Database → Query Performance

-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Optimize Queries:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_companies_org_status 
ON companies(organization_id, status);

-- Analyze query plans
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM companies 
WHERE organization_id = 'uuid' AND status = 'prospect';
```

### Memory Issues

**High Memory Usage:**
```bash
# Monitor memory usage
npm run dev &
PID=$!
while true; do
  ps -p $PID -o pid,vsz,rss,comm
  sleep 5
done
```

**Memory Leaks:**
```typescript
// Check for memory leaks in React
// Use React DevTools Profiler
// Look for components that don't unmount
// Check for event listeners not being removed

useEffect(() => {
  const handler = () => { /* ... */ }
  window.addEventListener('resize', handler)
  
  return () => {
    window.removeEventListener('resize', handler)
  }
}, [])
```

## 🔐 Security Issues

### CORS Errors

**"Access-Control-Allow-Origin" errors:**
```javascript
// Add to next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' }
        ]
      }
    ]
  }
}
```

### Authentication Issues

**Session Errors:**
```typescript
// Check Supabase session
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Refresh session if needed
const { data, error } = await supabase.auth.refreshSession()
```

## 📱 Browser-Specific Issues

### Safari Issues

**Date Input Problems:**
```typescript
// Use proper date format for Safari
const formatDateForSafari = (date: string) => {
  return new Date(date).toISOString().split('T')[0]
}
```

### Mobile Issues

**Touch Events:**
```css
/* Fix touch scrolling on iOS */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overflow-y: scroll;
}
```

**Viewport Issues:**
```html
<!-- Ensure proper viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

## 🆘 Getting Help

### Log Collection

**Frontend Logs:**
```bash
# Browser console logs
# Right-click → Inspect → Console
# Copy all error messages

# Network logs
# DevTools → Network → Export HAR file
```

**Backend Logs:**
```bash
# Vercel logs
vercel logs your-deployment-url

# Local development logs
npm run dev 2>&1 | tee debug.log
```

### Issue Reporting

**Include This Information:**
1. **Environment**: Development/Production, Browser, OS
2. **Steps to reproduce**: Exact sequence of actions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Error messages**: Complete error text
6. **Screenshots**: If UI-related
7. **Logs**: Relevant console/server logs

**Template:**
```markdown
## Bug Report

**Environment:**
- OS: macOS 14.0
- Browser: Chrome 120.0
- Node.js: 18.17.0
- Environment: Development

**Steps to Reproduce:**
1. Navigate to /companies
2. Click "Add Company"
3. Fill in form and click "Save"

**Expected Behavior:**
Company should be created and appear in list

**Actual Behavior:**
Error message appears: "Failed to create company"

**Error Messages:**
```
TypeError: Cannot read property 'id' of undefined
  at handleSave (companies/page.tsx:45)
```

**Additional Context:**
- Happens only with specific company names
- Works fine in production
- Started after recent update
```

### Support Channels

1. **Documentation**: Check all docs in `/docs` folder
2. **GitHub Issues**: Create detailed issue report
3. **Development Team**: Contact for urgent issues
4. **Community**: Stack Overflow with `orbitabm` tag

### Self-Help Checklist

Before asking for help:
- [ ] Checked this troubleshooting guide
- [ ] Searched existing GitHub issues
- [ ] Verified environment setup
- [ ] Tested in clean environment
- [ ] Collected relevant logs
- [ ] Prepared minimal reproduction case

---

Most issues can be resolved by following this guide. For complex problems, don't hesitate to reach out with detailed information about your specific situation.