# Organizations Management

OrbitABM's Organizations feature provides comprehensive multi-tenant organization management, allowing users to create, edit, list, and switch between different organizations within the platform.

## Overview

The Organizations system supports the multi-tenant architecture of OrbitABM, enabling:
- **Agency Management**: Marketing agencies can manage multiple client organizations
- **Client Organizations**: Individual client companies with their own data and campaigns
- **Organization Switching**: Seamless switching between different organizational contexts
- **Role-Based Access**: User roles and permissions within each organization

## Features

### 🏢 Organization Management
- **Create Organizations**: Add new agencies or client organizations
- **Edit Organizations**: Update organization details, settings, and metadata
- **Delete Organizations**: Soft delete with safety checks for active users
- **Organization Types**: Support for both 'agency' and 'client' organization types

### 🔄 Organization Switching
- **Context Switching**: Seamlessly switch between organizations
- **Persistent Selection**: Remember selected organization across sessions
- **Navigation Integration**: Organization switcher in sidebar navigation
- **Real-time Updates**: Immediate context updates throughout the application

### 📊 Organization Overview
- **User Count**: Display number of active users per organization
- **Activity Tracking**: Creation and update timestamps
- **Metadata Management**: Website, notes, and additional organization details
- **Slug-based URLs**: SEO-friendly organization identifiers

## User Interface

### Organizations Page (`/organizations`)

The main organizations management interface provides:

#### List View
- **Grid Layout**: Card-based organization display
- **Search & Filter**: Find organizations by name, slug, or type
- **Type Filtering**: Filter by agency or client organizations
- **Pagination**: Handle large numbers of organizations efficiently

#### Organization Cards
Each organization card displays:
- **Organization Name & Slug**: Primary identification
- **Type Badge**: Visual indicator for agency/client type
- **User Count**: Number of active users
- **Website Link**: Direct link to organization website
- **Notes Preview**: Truncated organization notes
- **Action Menu**: Edit and delete options
- **Timestamps**: Creation and last update dates

#### Create/Edit Modal
- **Organization Form**: Comprehensive form for organization details
- **Slug Generation**: Auto-generate URL-friendly slugs from names
- **Validation**: Real-time form validation with error messages
- **Type Selection**: Choose between agency and client types
- **Optional Fields**: Website URL and notes

### Organization Switcher

Integrated into the sidebar navigation:
- **Dropdown Interface**: Clean, accessible organization selection
- **Current Organization**: Highlighted current selection
- **Quick Access**: Easy switching without page navigation
- **Create New**: Direct link to create new organizations

## API Endpoints

### Core Organizations API

#### `GET /api/organizations`
List all organizations with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name or slug
- `type` (string): Filter by 'agency' or 'client'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Organization Name",
      "slug": "organization-slug",
      "type": "client",
      "website": "https://example.com",
      "notes": "Organization notes",
      "created_at": "2026-02-07T20:00:00Z",
      "updated_at": "2026-02-07T20:00:00Z",
      "deleted_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### `POST /api/organizations`
Create a new organization.

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-organization",
  "type": "client",
  "website": "https://example.com",
  "notes": "Optional notes"
}
```

#### `GET /api/organizations/[id]`
Get a single organization by ID with user count.

#### `PATCH /api/organizations/[id]`
Update an organization (partial updates supported).

#### `DELETE /api/organizations/[id]`
Soft delete an organization (with safety checks).

### User Organizations API

#### `GET /api/organizations/my-organizations`
Get organizations accessible to the current user.

**Response:**
```json
{
  "success": true,
  "data": [/* organizations */],
  "current_organization_id": "uuid",
  "user_role": "admin"
}
```

## Data Model

### Organization Schema

```typescript
interface Organization {
  id: string                    // UUID primary key
  name: string                  // Organization display name
  slug: string                  // URL-friendly identifier (unique)
  type: 'agency' | 'client'     // Organization type
  website?: string | null       // Organization website URL
  notes?: string | null         // Additional notes/description
  created_at: string           // ISO timestamp
  updated_at: string           // ISO timestamp
  deleted_at?: string | null   // Soft delete timestamp
}
```

### Validation Rules

- **Name**: Required, minimum 1 character
- **Slug**: Required, unique, lowercase letters/numbers/hyphens only
- **Type**: Required, must be 'agency' or 'client'
- **Website**: Optional, valid URL format
- **Notes**: Optional, text field

## Context Management

### Organization Context (`OrgContext`)

Provides application-wide organization state management:

```typescript
interface OrgContextType {
  currentOrgId: string | null
  currentOrg: OrganizationRow | null
  organizations: OrganizationRow[] | null
  setCurrentOrg: (org: OrganizationRow) => void
  setCurrentOrgId: (orgId: string) => void
  loading: boolean
  error: string | null
  refreshOrganizations: () => Promise<void>
}
```

### Usage in Components

```typescript
import { useOrg } from '@/lib/context/OrgContext'

function MyComponent() {
  const { currentOrg, organizations, setCurrentOrg } = useOrg()
  
  // Access current organization
  console.log(currentOrg?.name)
  
  // Switch organization
  const handleOrgSwitch = (org) => {
    setCurrentOrg(org)
  }
}
```

## Security & Permissions

### Authentication Requirements
- All organization endpoints require valid user authentication
- Unauthenticated requests return 401 Unauthorized

### Access Control
- Users can only access organizations they belong to
- Organization creation/editing requires appropriate permissions
- Deletion requires admin privileges and safety checks

### Data Protection
- Soft delete prevents accidental data loss
- Active user checks prevent deletion of organizations with users
- Input validation prevents malicious data entry

## Integration Points

### Navigation Integration
- Organization switcher in sidebar navigation
- Current organization display in header
- Context-aware menu items

### Route Protection
- Organization-specific data filtering
- Context switching updates all related data
- Persistent organization selection

### Database Integration
- Foreign key relationships to profiles table
- Cascade handling for related data
- Optimized queries with proper indexing

## Usage Examples

### Creating an Organization

```typescript
const createOrganization = async (data) => {
  const response = await fetch('/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Acme Corp',
      slug: 'acme-corp',
      type: 'client',
      website: 'https://acme.com',
      notes: 'Fortune 500 client'
    }),
  })
  
  if (response.ok) {
    const result = await response.json()
    console.log('Created:', result.data)
  }
}
```

### Switching Organizations

```typescript
import { useOrg } from '@/lib/context/OrgContext'

function OrganizationSwitcher() {
  const { organizations, currentOrg, setCurrentOrg } = useOrg()
  
  const handleSwitch = (org) => {
    setCurrentOrg(org)
    // Context automatically updates throughout the app
  }
  
  return (
    <select onChange={(e) => {
      const org = organizations.find(o => o.id === e.target.value)
      if (org) handleSwitch(org)
    }}>
      {organizations?.map(org => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
```

## Best Practices

### Slug Management
- Auto-generate slugs from organization names
- Ensure uniqueness across all organizations
- Use lowercase, hyphens for word separation
- Validate format (alphanumeric + hyphens only)

### Error Handling
- Provide clear validation messages
- Handle network errors gracefully
- Show loading states during operations
- Confirm destructive actions

### Performance
- Implement pagination for large organization lists
- Use optimistic updates for better UX
- Cache organization data appropriately
- Minimize API calls with efficient queries

### User Experience
- Persistent organization selection
- Clear visual indicators for current organization
- Smooth transitions between organizations
- Intuitive navigation and controls

## Troubleshooting

### Common Issues

1. **Organization Not Found (404)**
   - Verify organization ID is correct
   - Check if organization was soft deleted
   - Ensure user has access to the organization

2. **Slug Already Exists (409)**
   - Generate a unique slug
   - Check for existing organizations with same slug
   - Consider adding numeric suffix for uniqueness

3. **Cannot Delete Organization (409)**
   - Check for active users in the organization
   - Reassign or remove users before deletion
   - Verify user has deletion permissions

4. **Context Not Updating**
   - Ensure OrgProvider wraps the application
   - Check for proper context usage in components
   - Verify API responses are correct

### Debug Mode

Enable debug logging in the organization context:

```typescript
useEffect(() => {
  console.log('Current org changed:', currentOrg)
  console.log('Available orgs:', organizations)
}, [currentOrg, organizations])
```

## Future Enhancements

- **Organization Templates**: Predefined organization setups
- **Bulk Operations**: Mass organization management
- **Organization Analytics**: Usage and activity metrics
- **Advanced Permissions**: Granular role-based access control
- **Organization Branding**: Custom themes and branding per organization
- **API Keys**: Organization-specific API access tokens