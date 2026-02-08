# OrbitABM Testing Guide

Comprehensive testing documentation for OrbitABM, covering manual testing procedures, automated testing setup, and quality assurance guidelines.

## 🧪 Testing Overview

OrbitABM uses a multi-layered testing approach:
- **Manual Testing**: User acceptance testing and exploratory testing
- **Integration Testing**: API endpoint testing and database operations
- **Component Testing**: UI component functionality testing
- **Security Testing**: Authentication, authorization, and RLS policy testing
- **Performance Testing**: Load testing and optimization validation

## 📋 Manual Testing Procedures

### Pre-Release Testing Checklist

#### Authentication & Authorization
- [ ] User registration with email verification
- [ ] User login with valid credentials
- [ ] User login with invalid credentials (should fail)
- [ ] Password reset functionality
- [ ] Session persistence across browser refresh
- [ ] Automatic logout on session expiry
- [ ] Organization context switching
- [ ] Role-based access control (admin/manager/viewer)

#### Core Functionality
- [ ] Organization management (create, edit, delete, switch)
- [ ] Company management (CRUD operations)
- [ ] Contact management (CRUD operations)
- [ ] Campaign creation and management
- [ ] Activity tracking and completion
- [ ] Playbook template management
- [ ] Market and vertical management
- [ ] PE tracking functionality
- [ ] Asset management
- [ ] Results logging

#### Data Import/Export
- [ ] CSV import for companies
- [ ] CSV import for contacts
- [ ] CSV import for markets and verticals
- [ ] CSV import error handling
- [ ] Data export functionality
- [ ] Template download functionality
- [ ] Column mapping interface
- [ ] Import validation and preview

#### Campaign Board
- [ ] Kanban board display
- [ ] Campaign card information
- [ ] Status filtering
- [ ] Drag and drop functionality (if implemented)
- [ ] Campaign status updates
- [ ] Board responsiveness

#### Dashboard & Analytics
- [ ] Key metrics display
- [ ] Upcoming activities list
- [ ] Recent results display
- [ ] Campaign status charts
- [ ] Market overview
- [ ] At-risk campaigns identification

#### UI/UX Testing
- [ ] Responsive design on mobile devices
- [ ] Responsive design on tablets
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Loading states and spinners
- [ ] Error message display
- [ ] Success notification toasts
- [ ] Form validation messages
- [ ] Navigation and routing

### Browser Compatibility Testing

Test on the following browsers and versions:

**Desktop:**
- Chrome 120+ ✅
- Firefox 115+ ✅
- Safari 16+ ✅
- Edge 120+ ✅

**Mobile:**
- Chrome Mobile (Android)
- Safari Mobile (iOS)
- Samsung Internet

**Tablet:**
- iPad Safari
- Android Chrome

### Device Testing

**Screen Resolutions:**
- Mobile: 375px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+
- Large Desktop: 1440px+

## 🔧 Automated Testing Setup

### Prerequisites

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev vitest jsdom
npm install --save-dev @types/testing-library__jest-dom
```

### Test Configuration

**File: `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**File: `src/test/setup.ts`**
```typescript
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock Supabase
beforeAll(() => {
  // Setup test environment
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  // Cleanup test environment
})
```

### Component Testing Examples

**Testing a Form Component:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CompanyForm } from '@/components/companies/CompanyForm'

describe('CompanyForm', () => {
  it('renders form fields correctly', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Website')).toBeInTheDocument()
    expect(screen.getByLabelText('Market')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const mockSubmit = vi.fn()
    render(<CompanyForm onSubmit={mockSubmit} />)
    
    fireEvent.click(screen.getByText('Save'))
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
    
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const mockSubmit = vi.fn()
    render(<CompanyForm onSubmit={mockSubmit} />)
    
    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Test Company' }
    })
    
    fireEvent.click(screen.getByText('Save'))
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Test Company',
        // ... other form data
      })
    })
  })
})
```

**Testing API Hooks:**
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useCompanies } from '@/lib/hooks/useCompanies'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => Promise.resolve({
            data: [{ id: '1', name: 'Test Company' }],
            error: null
          }))
        }))
      }))
    }))
  }
}))

describe('useCompanies', () => {
  it('fetches companies successfully', async () => {
    const { result } = renderHook(() => useCompanies('org-id'))
    
    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].name).toBe('Test Company')
    })
  })
})
```

## 🔒 Security Testing

### Authentication Testing

**Test Cases:**
- [ ] Unauthenticated users cannot access protected routes
- [ ] Invalid tokens are rejected
- [ ] Expired tokens trigger re-authentication
- [ ] Session hijacking prevention
- [ ] CSRF protection
- [ ] SQL injection prevention

**Manual Testing:**
```bash
# Test unauthenticated access
curl -I http://localhost:3000/dashboard
# Should return 401 or redirect to login

# Test invalid token
curl -H "Authorization: Bearer invalid-token" http://localhost:3000/api/companies
# Should return 401 Unauthorized

# Test SQL injection
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "Company'; DROP TABLE companies; --"}'
# Should be safely handled
```

### Row Level Security Testing

**Database Testing:**
```sql
-- Test as different users
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user1-uuid", "role": "authenticated"}';

-- Should only return user1's organization data
SELECT * FROM companies;

-- Switch to different user
SET LOCAL "request.jwt.claims" TO '{"sub": "user2-uuid", "role": "authenticated"}';

-- Should only return user2's organization data
SELECT * FROM companies;

-- Test unauthorized access
SELECT * FROM companies WHERE organization_id != get_user_organization_id();
-- Should return no results due to RLS
```

### API Security Testing

**Automated Security Tests:**
```typescript
describe('API Security', () => {
  it('requires authentication for protected endpoints', async () => {
    const response = await fetch('/api/companies')
    expect(response.status).toBe(401)
  })

  it('enforces organization isolation', async () => {
    const user1Token = 'user1-jwt-token'
    const user2Token = 'user2-jwt-token'
    
    // Create company as user1
    const createResponse = await fetch('/api/companies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ name: 'Test Company' })
    })
    
    const company = await createResponse.json()
    
    // Try to access as user2
    const accessResponse = await fetch(`/api/companies/${company.data.id}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    })
    
    expect(accessResponse.status).toBe(404) // Should not find due to RLS
  })
})
```

## 📊 Performance Testing

### Load Testing

**Using Artillery.js:**
```bash
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/companies?organization_id=test-org"
          headers:
            Authorization: "Bearer test-token"
EOF

# Run load test
artillery run load-test.yml
```

### Performance Benchmarks

**Target Performance Metrics:**
- Page load time: < 2 seconds
- API response time: < 500ms
- Database query time: < 100ms
- Time to interactive: < 3 seconds
- First contentful paint: < 1.5 seconds

**Monitoring Tools:**
- Lighthouse for Core Web Vitals
- Chrome DevTools Performance tab
- Vercel Analytics
- Supabase Performance Insights

### Database Performance Testing

```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM companies 
WHERE organization_id = 'uuid' AND status = 'prospect';

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'companies';
```

## 🚀 Continuous Integration Testing

### GitHub Actions Workflow

**File: `.github/workflows/test.yml`**
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run linting
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test
        
      - name: Run build
        run: npm run build
        
      - name: Run security audit
        run: npm audit --audit-level high
```

## 📱 Mobile Testing

### Responsive Design Testing

**Breakpoints to Test:**
- Mobile: 320px, 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px

**Mobile-Specific Tests:**
- [ ] Touch interactions work properly
- [ ] Forms are usable on mobile keyboards
- [ ] Navigation is accessible on small screens
- [ ] Tables scroll horizontally when needed
- [ ] Modals and overlays work on mobile
- [ ] Performance on slower mobile connections

### Mobile Testing Tools

**Browser DevTools:**
- Chrome DevTools Device Emulation
- Firefox Responsive Design Mode
- Safari Web Inspector

**Real Device Testing:**
- iOS Safari (iPhone, iPad)
- Android Chrome
- Various screen sizes and orientations

## 🔍 Accessibility Testing

### WCAG Compliance Testing

**Automated Testing:**
```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Add to test setup
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

// Test component accessibility
it('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

**Manual Testing:**
- [ ] Keyboard navigation works throughout the app
- [ ] Screen reader compatibility (NVDA, JAWS, VoiceOver)
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible
- [ ] Alt text for images
- [ ] Proper heading hierarchy
- [ ] Form labels are associated correctly

## 📝 Test Data Management

### Test Database Setup

```sql
-- Create test organization
INSERT INTO organizations (id, name, slug, type) 
VALUES ('test-org-id', 'Test Organization', 'test-org', 'agency');

-- Create test user profile
INSERT INTO profiles (id, organization_id, role, full_name) 
VALUES ('test-user-id', 'test-org-id', 'admin', 'Test User');

-- Create test companies
INSERT INTO companies (organization_id, name, status) 
VALUES ('test-org-id', 'Test Company 1', 'prospect'),
       ('test-org-id', 'Test Company 2', 'target');
```

### Mock Data Generators

```typescript
// Test data factories
export const createMockCompany = (overrides = {}) => ({
  id: 'company-' + Math.random().toString(36).substr(2, 9),
  organization_id: 'test-org-id',
  name: 'Test Company',
  status: 'prospect',
  created_at: new Date().toISOString(),
  ...overrides
})

export const createMockCampaign = (overrides = {}) => ({
  id: 'campaign-' + Math.random().toString(36).substr(2, 9),
  organization_id: 'test-org-id',
  name: 'Test Campaign',
  status: 'active',
  company_id: 'test-company-id',
  ...overrides
})
```

## 🐛 Bug Reporting Template

### Bug Report Format

```markdown
## Bug Report

**Environment:**
- OS: [Windows/macOS/Linux]
- Browser: [Chrome/Firefox/Safari/Edge] [Version]
- Screen Resolution: [e.g., 1920x1080]
- Device: [Desktop/Mobile/Tablet]

**Steps to Reproduce:**
1. Navigate to [page]
2. Click on [element]
3. Enter [data]
4. Click [button]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Error Messages:**
```
[Any error messages or console output]
```

**Screenshots:**
[Attach screenshots if applicable]

**Additional Context:**
[Any other relevant information]
```

## 📈 Testing Metrics

### Coverage Goals
- Unit Test Coverage: > 80%
- Integration Test Coverage: > 70%
- E2E Test Coverage: > 60%
- Critical Path Coverage: 100%

### Quality Gates
- All tests must pass
- No high-severity security vulnerabilities
- Performance benchmarks must be met
- Accessibility standards must be maintained
- Code coverage thresholds must be met

## 🔄 Test Maintenance

### Regular Testing Tasks

**Weekly:**
- [ ] Run full test suite
- [ ] Check for flaky tests
- [ ] Update test data
- [ ] Review test coverage

**Monthly:**
- [ ] Security vulnerability scan
- [ ] Performance regression testing
- [ ] Cross-browser compatibility check
- [ ] Mobile device testing

**Quarterly:**
- [ ] Accessibility audit
- [ ] Load testing
- [ ] Test suite optimization
- [ ] Testing tool updates

---

This testing guide ensures comprehensive quality assurance for OrbitABM. For specific testing procedures, refer to the individual test files in the `/src/test/` directory.