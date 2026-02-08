# OrbitABM Architecture Documentation

This document provides a comprehensive overview of OrbitABM's system architecture, design decisions, and technical implementation details.

## 🏗️ System Overview

OrbitABM is a multi-tenant Account-Based Marketing (ABM) campaign intelligence platform built with modern web technologies and designed for scalability, security, and maintainability.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Next.js App   │    │   Supabase      │
│                 │    │                 │    │                 │
│ • Web Browser   │◄──►│ • App Router    │◄──►│ • PostgreSQL    │
│ • Mobile (TBD)  │    │ • API Routes    │    │ • Auth          │
│ • Third-party   │    │ • Middleware    │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Design Principles

### 1. Multi-Tenant from Day One
- Every data table includes `organization_id` for tenant isolation
- Row Level Security (RLS) enforces data access boundaries
- Organization context drives all data queries and operations

### 2. Security First
- Comprehensive Row Level Security policies
- Authentication required for all operations
- Input validation and sanitization
- Secure session management with JWT tokens

### 3. Scalable Architecture
- Stateless application design
- Database-driven configuration
- Horizontal scaling capabilities
- Efficient query patterns with proper indexing

### 4. Developer Experience
- TypeScript for type safety
- Comprehensive error handling
- Consistent API patterns
- Extensive documentation

### 5. User Experience
- Real-time feedback with toast notifications
- Optimistic UI updates
- Responsive design for all devices
- Intuitive navigation and workflows

## 🏛️ Application Architecture

### Frontend Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── api/               # API route handlers
│   ├── dashboard/         # Dashboard page
│   ├── companies/         # Company management
│   ├── campaigns/         # Campaign management
│   └── ...               # Other feature pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   ├── auth/             # Authentication components
│   └── [feature]/        # Feature-specific components
├── lib/                  # Core utilities
│   ├── supabase/         # Database client and queries
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
└── middleware.ts         # Next.js middleware
```

### Component Architecture

**Layered Component Structure:**
1. **Pages**: Route-level components that orchestrate data and layout
2. **Feature Components**: Business logic components for specific features
3. **UI Components**: Reusable, generic UI elements
4. **Layout Components**: Application shell and navigation

**Component Design Patterns:**
- **Container/Presentational**: Separate data logic from presentation
- **Compound Components**: Complex components with multiple sub-components
- **Render Props**: Flexible component composition patterns
- **Custom Hooks**: Reusable stateful logic

### State Management

**Multi-Level State Strategy:**
- **Server State**: Managed by Supabase with React hooks
- **Client State**: React useState and useReducer for local state
- **Global State**: React Context for organization and authentication
- **Form State**: Controlled components with validation

**Context Providers:**
```typescript
// Organization context for multi-tenant state
const OrgContext = createContext<OrgContextType>()

// Authentication context for user state
const AuthContext = createContext<AuthContextType>()
```

## 🗄️ Database Architecture

### Schema Design Philosophy

**Multi-Tenant Design:**
- Every table has `organization_id` for tenant isolation
- Shared reference tables (markets, pe_platforms) for common data
- Soft deletes with `deleted_at` timestamps
- Audit trails with `created_at` and `updated_at`

**Entity Relationship Model:**
```
Organizations (1) ──< (N) Profiles (Users)
     │
     ├──< Markets
     ├──< Verticals  
     ├──< PE Platforms ──< PE Acquisitions >── Companies
     ├──< Companies ──< Contacts
     │        │         ├──< Digital Snapshots
     │        │         └──< Assets
     │        │
     ├──< Playbook Templates ──< Playbook Steps
     │        │
     ├──< Campaigns ──< Activities
     │        │       ├──< Campaign Competitors
     │        │       ├──< Assets
     │        │       └──< Results
     │
     └──< Document Templates ──< Generated Documents
              │
              └──< Email Templates
```

### Database Tables (17 Core Tables)

**Core Entities:**
1. `organizations` - Tenant isolation
2. `profiles` - User management
3. `companies` - Prospects and competitors
4. `contacts` - People at target companies
5. `campaigns` - Campaign instances
6. `activities` - Individual touchpoints

**Reference Data:**
7. `markets` - Geographic markets
8. `verticals` - Industry classifications
9. `pe_platforms` - Private equity platforms
10. `pe_acquisitions` - PE acquisition tracking

**Campaign Management:**
11. `playbook_templates` - Reusable sequences
12. `playbook_steps` - Template steps
13. `campaign_competitors` - Competitive context
14. `assets` - Campaign materials
15. `results` - Campaign outcomes

**Intelligence System:**
16. `digital_snapshots` - Digital presence data
17. `audit_logs` - System audit trail

**Document Intelligence:**
18. `document_templates` - Document templates
19. `generated_documents` - AI-generated documents
20. `email_templates` - Campaign email templates

### Row Level Security (RLS)

**Security Model:**
- All tables have RLS enabled
- Organization-scoped access policies
- Role-based permissions (admin/manager/viewer)
- Helper functions for policy enforcement

**Example RLS Policy:**
```sql
CREATE POLICY "Users can view companies in their organization"
ON companies FOR SELECT
USING (organization_id = get_user_organization_id());
```

**Security Helper Functions:**
```sql
-- Get user's organization ID
CREATE FUNCTION get_user_organization_id() RETURNS uuid;

-- Check if user can manage organization
CREATE FUNCTION can_manage_organization(org_id uuid) RETURNS boolean;

-- Check if user is admin
CREATE FUNCTION is_user_admin() RETURNS boolean;
```

## 🔌 API Architecture

### RESTful API Design

**Endpoint Structure:**
```
/api/[entity]           # Collection operations (GET, POST)
/api/[entity]/[id]      # Resource operations (GET, PATCH, DELETE)
/api/[entity]/import    # Bulk import operations
```

**Response Format:**
```typescript
// Success Response
{
  data: T | T[],
  success: true,
  count?: number
}

// Error Response  
{
  error: string,
  code: string,
  success: false,
  details?: object
}
```

### API Route Implementation

**Standard CRUD Pattern:**
```typescript
// GET /api/companies
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('organization_id')
  
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
  
  if (error) throw new ApiError(error.message)
  
  return NextResponse.json({ data, success: true })
}
```

**Error Handling:**
```typescript
try {
  // API operation
} catch (error) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, success: false },
      { status: error.statusCode }
    )
  }
  
  return NextResponse.json(
    { error: 'Internal server error', success: false },
    { status: 500 }
  )
}
```

## 🔐 Security Architecture

### Authentication Flow

```
User Login → Supabase Auth → JWT Token → Session Cookie → Request Headers
     ↓
Protected Route → Middleware → Token Validation → User Context
     ↓
API Request → RLS Policy Check → Data Access → Response
```

### Authorization Layers

1. **Route Protection**: Middleware redirects unauthenticated users
2. **API Authentication**: JWT token validation on API routes
3. **Row Level Security**: Database-level access control
4. **Role-Based Access**: User role enforcement in application logic

### Security Features

- **Session Management**: Secure HTTP-only cookies
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Input Validation**: Server-side validation and sanitization
- **SQL Injection Prevention**: Parameterized queries and RLS
- **XSS Protection**: Content Security Policy headers
- **Rate Limiting**: Supabase built-in rate limiting

## 📱 Frontend Architecture

### Next.js App Router

**File-Based Routing:**
- `app/` directory for route definitions
- Layout components for shared UI
- Loading and error boundaries
- Server and client components

**Server-Side Rendering:**
- Static generation for public pages
- Server-side rendering for dynamic content
- Incremental Static Regeneration (ISR)
- Edge runtime for optimal performance

### Component Library

**Design System:**
- Consistent color palette and typography
- Reusable UI components with TypeScript props
- Responsive design with Tailwind CSS
- Accessibility compliance (WCAG 2.1)

**Key Components:**
- `DataTable` - Generic data display with sorting/filtering
- `SlideOver` - Modal panels for forms and details
- `StatusBadge` - Consistent status indicators
- `PageHeader` - Standard page headers with actions
- `ErrorBoundary` - Error handling and recovery

### Data Fetching Strategy

**Custom Hooks Pattern:**
```typescript
export function useCompanies(orgId: string, filters?: CompanyFilters) {
  const [data, setData] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const refetch = useCallback(async () => {
    // Fetch logic
  }, [orgId, filters])
  
  useEffect(() => {
    refetch()
  }, [refetch])
  
  return { data, loading, error, refetch }
}
```

## 🚀 Performance Architecture

### Optimization Strategies

**Frontend Performance:**
- Code splitting with dynamic imports
- Image optimization with Next.js Image component
- Bundle analysis and optimization
- Lazy loading for non-critical components
- Memoization for expensive calculations

**Database Performance:**
- Strategic indexing on frequently queried columns
- Query optimization with EXPLAIN ANALYZE
- Connection pooling with Supabase
- Efficient JOIN patterns
- Pagination for large datasets

**Caching Strategy:**
- Browser caching for static assets
- API response caching where appropriate
- Supabase query caching
- CDN caching for global distribution

### Monitoring and Analytics

**Performance Monitoring:**
- Core Web Vitals tracking
- API response time monitoring
- Database query performance
- Error rate tracking
- User experience metrics

**Tools:**
- Vercel Analytics for performance insights
- Supabase Performance dashboard
- Chrome DevTools for development
- Lighthouse for auditing

## 🔄 Data Flow Architecture

### Request/Response Flow

```
User Action → Component → Hook → API Route → Supabase → Database
     ↓
Response ← Component ← Hook ← API Route ← Supabase ← Database
     ↓
UI Update → Toast Notification → State Update → Re-render
```

### State Synchronization

**Optimistic Updates:**
1. Update UI immediately
2. Send API request
3. Handle success/failure
4. Sync state with server response

**Error Handling:**
1. Catch errors at multiple levels
2. Display user-friendly messages
3. Provide recovery options
4. Log errors for debugging

## 🧪 Testing Architecture

### Testing Strategy

**Test Pyramid:**
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Full user workflow testing
- **Manual Tests**: User acceptance testing

**Testing Tools:**
- Vitest for unit testing
- Testing Library for component testing
- Playwright for E2E testing (planned)
- Manual testing procedures

### Test Organization

```
src/
├── __tests__/          # Unit tests
├── components/
│   └── __tests__/      # Component tests
├── lib/
│   └── __tests__/      # Utility tests
└── test/
    ├── setup.ts        # Test configuration
    ├── mocks/          # Mock data and functions
    └── helpers/        # Test utilities
```

## 🚀 Deployment Architecture

### Production Environment

**Hosting:**
- **Frontend**: Vercel (Edge Network, Automatic deployments)
- **Database**: Supabase (Managed PostgreSQL)
- **Storage**: Supabase Storage (File uploads)
- **CDN**: Vercel Edge Network

**CI/CD Pipeline:**
1. Code push to GitHub
2. Automated testing
3. Build verification
4. Deployment to Vercel
5. Database migrations (manual)
6. Smoke tests

### Environment Configuration

**Development:**
- Local Next.js development server
- Supabase local development (optional)
- Hot reloading and debugging

**Staging:**
- Production-like environment
- Separate Supabase project
- Testing and validation

**Production:**
- Optimized builds
- Performance monitoring
- Error tracking
- Backup strategies

## 📈 Scalability Considerations

### Horizontal Scaling

**Application Scaling:**
- Stateless application design
- Edge deployment with Vercel
- API route optimization
- Database connection pooling

**Database Scaling:**
- Read replicas for query distribution
- Connection pooling and management
- Query optimization and indexing
- Partitioning for large tables (future)

### Performance Optimization

**Frontend Optimization:**
- Code splitting and lazy loading
- Image optimization and compression
- Bundle size optimization
- Caching strategies

**Backend Optimization:**
- Database query optimization
- API response caching
- Connection pooling
- Background job processing (future)

## 🔮 Future Architecture Considerations

### Planned Enhancements

**Microservices Evolution:**
- API Gateway for service orchestration
- Separate services for specific domains
- Event-driven architecture
- Message queuing for async operations

**Advanced Features:**
- Real-time updates with WebSockets
- Background job processing
- Advanced caching layers
- Multi-region deployment

**AI/ML Integration:**
- Document generation services
- Predictive analytics
- Recommendation engines
- Natural language processing

### Technology Roadmap

**Short Term (3-6 months):**
- Enhanced testing coverage
- Performance optimizations
- Mobile responsiveness improvements
- Advanced error handling

**Medium Term (6-12 months):**
- Real-time features
- Advanced analytics
- AI-powered features
- Third-party integrations

**Long Term (12+ months):**
- Microservices architecture
- Mobile applications
- Advanced automation
- Enterprise features

---

This architecture documentation provides a comprehensive overview of OrbitABM's technical implementation. For specific implementation details, refer to the codebase and individual component documentation.