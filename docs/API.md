# OrbitABM API Documentation

RESTful API endpoints for programmatic access to OrbitABM data and functionality.

## 📖 Documentation Formats

- **[Interactive API Docs](http://localhost:3000/api-docs)** - Swagger UI with live testing
- **[Markdown Documentation](http://localhost:3000/api-docs/markdown)** - Traditional documentation format
- **[OpenAPI Specification](http://localhost:3000/api/openapi.json)** - Machine-readable API spec for code generation

## 📋 Implementation Status

**Currently Implemented:**
- ✅ Organizations API (full CRUD + my-organizations)
- ✅ Companies API (full CRUD + bulk import)
- ✅ Contacts API (full CRUD)
- ✅ Markets API (full CRUD)
- ✅ Verticals API (full CRUD)
- ✅ Campaigns API (full CRUD)
- ✅ Activities API (full CRUD)
- ✅ Assets API (full CRUD)
- ✅ Results API (full CRUD)
- ✅ Playbook Templates API (full CRUD)
- ✅ Playbook Steps API (full CRUD)
- ✅ Digital Snapshots API (full CRUD)
- ✅ Document Templates API (full CRUD)
- ✅ Generated Documents API (full CRUD)
- ✅ Email Templates API (full CRUD)
- ✅ Audit Logs API (read-only)

**Recently Added:**
- ✅ Authentication & Authorization (Supabase Auth)
- ✅ Row Level Security policies
- ✅ Organization context management
- ✅ Comprehensive error handling
- ✅ OpenAPI documentation

**Planned for Future Releases:**
- 🔄 Webhooks & Real-time updates
- 🔄 Bulk import for additional entities
- 🔄 Advanced filtering and search
- 🔄 Rate limiting and throttling
- 🔄 API versioning

## 🔐 Authentication

**Current Status**: JWT-based authentication with Supabase Auth
**Authorization**: Row Level Security (RLS) with organization-based access control

### Authentication Methods

**Session-based Authentication:**
```javascript
// Client-side authentication check
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  // Redirect to login
}
```

**API Route Authentication:**
```javascript
// Server-side authentication in API routes
const { data: { session }, error } = await supabase.auth.getSession()
if (error || !session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Organization Context

All API requests are automatically scoped to the user's organization through RLS policies. The `organization_id` is derived from the authenticated user's profile.

## 📋 Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## 📊 Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "data": [...],
  "success": true,
  "count": 25
}
```

### Error Response
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "success": false,
  "details": {...}
}
```

## 🏢 Companies API

### List Companies
```http
GET /api/companies
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `market_id` (optional) - Filter by market
- `vertical_id` (optional) - Filter by vertical
- `status` (optional) - Filter by status
- `ownership_type` (optional) - Filter by ownership
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/companies?organization_id=123&status=prospect&limit=50"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme HVAC",
      "market_id": "uuid",
      "vertical_id": "uuid",
      "website": "https://acmehvac.com",
      "estimated_revenue": 2500000,
      "employee_count": 25,
      "status": "prospect",
      "qualifying_tier": "top",
      "ownership_type": "independent",
      "created_at": "2024-02-07T10:00:00Z",
      "markets": { "name": "Fort Wayne, IN" },
      "verticals": { "name": "HVAC Companies" }
    }
  ],
  "success": true,
  "count": 1
}
```

### Get Single Company
```http
GET /api/companies/{id}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Acme HVAC",
    // ... full company object
  },
  "success": true
}
```

### Create Company
```http
POST /api/companies
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "name": "New Company",
  "market_id": "uuid",
  "vertical_id": "uuid",
  "website": "https://example.com",
  "estimated_revenue": 1000000,
  "employee_count": 10,
  "status": "prospect",
  "qualifying_tier": "qualified"
}
```

### Update Company
```http
PATCH /api/companies/{id}
```

**Request Body:** (partial update)
```json
{
  "status": "target",
  "qualifying_tier": "top",
  "notes": "Updated notes"
}
```

### Delete Company (Soft Delete)
```http
DELETE /api/companies/{id}
```

Sets `deleted_at` timestamp. Returns success confirmation.

### Bulk Import Companies
```http
POST /api/companies/import
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "data": [
    {
      "name": "Company 1",
      "market": "Fort Wayne, IN",
      "vertical": "HVAC Companies",
      "website": "https://company1.com"
    },
    {
      "name": "Company 2",
      "market": "Madison, WI",
      "vertical": "HVAC Companies"
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "created": 2,
    "errors": []
  },
  "success": true
}
```

## 👥 Contacts API

### List Contacts
```http
GET /api/contacts?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required)
- `company_id` (optional) - Filter by company
- `relationship_status` (optional) - Filter by relationship status

### Create Contact
```http
POST /api/contacts
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "company_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "title": "CEO",
  "email": "john@company.com",
  "phone": "555-0123",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "is_primary": true,
  "relationship_status": "identified",
  "dmu_role": "economic_buyer",
  "email_verified": false
}
```

### Update Contact
```http
PATCH /api/contacts/{id}
```

### Delete Contact
```http
DELETE /api/contacts/{id}
```

## 🗺️ Markets API

### List Markets
```http
GET /api/markets?organization_id=uuid
```

### Create Market
```http
POST /api/markets
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "name": "Austin, TX",
  "state": "TX",
  "metro_population": 2300000,
  "market_size_estimate": 50000000,
  "pe_activity_level": "moderate"
}
```

### Update Market
```http
PATCH /api/markets/{id}
```

### Delete Market
```http
DELETE /api/markets/{id}
```

## 🏭 Verticals API

### List Verticals
```http
GET /api/verticals?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `sector` (optional) - Filter by sector
- `tier` (optional) - Filter by tier
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/verticals?organization_id=123&sector=Home Services"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "HVAC Companies",
      "sector": "Home Services",
      "b2b_b2c": "B2C",
      "naics_code": "238220",
      "revenue_floor": 2000000,
      "typical_revenue_range": "$2M - $10M",
      "typical_marketing_budget_pct": "3-5%",
      "key_decision_maker_title": "Owner/CEO",
      "tier": "tier_1",
      "notes": "High-value vertical with strong ROI",
      "created_at": "2024-02-07T10:00:00Z"
    }
  ],
  "success": true,
  "count": 1
}
```

### Get Single Vertical
```http
GET /api/verticals/{id}
```

### Create Vertical
```http
POST /api/verticals
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "name": "Plumbing Companies",
  "sector": "Home Services",
  "b2b_b2c": "B2C",
  "naics_code": "238220",
  "revenue_floor": 2000000,
  "typical_revenue_range": "$2M - $8M",
  "typical_marketing_budget_pct": "2-4%",
  "key_decision_maker_title": "Owner",
  "tier": "tier_2",
  "notes": "Seasonal business patterns"
}
```

### Update Vertical
```http
PATCH /api/verticals/{id}
```

**Request Body:** (partial update)
```json
{
  "tier": "tier_1",
  "revenue_floor": 3000000,
  "notes": "Updated tier based on performance"
}
```

### Delete Vertical
```http
DELETE /api/verticals/{id}
```

**Note**: Cannot delete verticals that are in use by companies.

## 🎯 Campaigns API

### List Campaigns
```http
GET /api/campaigns?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `status` (optional) - Filter by campaign status
- `market_id` (optional) - Filter by market
- `vertical_id` (optional) - Filter by vertical
- `assigned_to` (optional) - Filter by assignment
- `company_id` (optional) - Filter by company
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/campaigns?organization_id=123&status=active"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme HVAC Q1 Campaign",
      "company_id": "uuid",
      "playbook_template_id": "uuid",
      "market_id": "uuid",
      "vertical_id": "uuid",
      "status": "active",
      "start_date": "2024-02-01",
      "end_date": "2024-04-30",
      "current_step": 3,
      "assigned_to": "uuid",
      "notes": "High-priority target",
      "created_at": "2024-02-07T10:00:00Z",
      "companies": {
        "id": "uuid",
        "name": "Acme HVAC",
        "website": "https://acmehvac.com"
      },
      "markets": {
        "id": "uuid",
        "name": "Fort Wayne, IN",
        "state": "IN"
      },
      "verticals": {
        "id": "uuid",
        "name": "HVAC Companies",
        "sector": "Home Services"
      },
      "playbook_templates": {
        "id": "uuid",
        "name": "Standard HVAC Outreach",
        "total_duration_days": 45
      }
    }
  ],
  "success": true,
  "count": 1
}
```

### Get Single Campaign
```http
GET /api/campaigns/{id}
```

**Response includes detailed playbook steps and company information.**

### Create Campaign
```http
POST /api/campaigns
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "name": "Acme HVAC Campaign",
  "company_id": "uuid",
  "playbook_template_id": "uuid",
  "market_id": "uuid",
  "vertical_id": "uuid",
  "status": "planned",
  "start_date": "2024-02-07",
  "end_date": "2024-04-07",
  "assigned_to": "uuid",
  "value_proposition": "Comprehensive digital marketing to drive leads",
  "primary_wedge": "Their Google rating dropped below competitors",
  "backup_trigger": "Q2 budget planning cycle",
  "success_criteria": "Signed $5k/mo retainer within 90 days",
  "research_doc_id": "uuid",
  "sequence_doc_id": "uuid",
  "notes": "Q1 priority campaign"
}
```

### Update Campaign
```http
PATCH /api/campaigns/{id}
```

**Request Body:** (partial update)
```json
{
  "status": "active",
  "current_step": 2,
  "notes": "Campaign launched successfully"
}
```

### Delete Campaign
```http
DELETE /api/campaigns/{id}
```

**Note**: Cannot delete campaigns with existing activities or results.

## 📸 Digital Snapshots API

### List Digital Snapshots
```http
GET /api/digital-snapshots?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `company_id` (optional) - Filter by company
- `snapshot_date` (optional) - Filter by specific date
- `from_date` (optional) - Filter from date (YYYY-MM-DD)
- `to_date` (optional) - Filter to date (YYYY-MM-DD)
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/digital-snapshots?organization_id=123&company_id=456"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "snapshot_date": "2024-02-07",
      "google_rating": 4.5,
      "google_review_count": 127,
      "yelp_rating": 4.2,
      "yelp_review_count": 45,
      "bbb_rating": "A+",
      "facebook_followers": 1250,
      "instagram_followers": 890,
      "linkedin_followers": 340,
      "domain_authority": 35,
      "page_speed_mobile": 78,
      "page_speed_desktop": 85,
      "organic_keywords": 245,
      "monthly_organic_traffic_est": 1200,
      "website_has_ssl": true,
      "website_is_mobile_responsive": true,
      "has_online_booking": true,
      "has_live_chat": false,
      "has_blog": true,
      "notes": "Strong digital presence",
      "created_at": "2024-02-07T10:00:00Z",
      "companies": {
        "id": "uuid",
        "name": "Acme HVAC",
        "website": "https://acmehvac.com"
      }
    }
  ],
  "success": true,
  "count": 1
}
```

### Get Single Digital Snapshot
```http
GET /api/digital-snapshots/{id}
```

### Create Digital Snapshot
```http
POST /api/digital-snapshots
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "company_id": "uuid",
  "snapshot_date": "2024-02-07",
  "google_rating": 4.5,
  "google_review_count": 127,
  "yelp_rating": 4.2,
  "yelp_review_count": 45,
  "bbb_rating": "A+",
  "facebook_followers": 1250,
  "instagram_followers": 890,
  "linkedin_followers": 340,
  "domain_authority": 35,
  "page_speed_mobile": 78,
  "page_speed_desktop": 85,
  "organic_keywords": 245,
  "monthly_organic_traffic_est": 1200,
  "website_has_ssl": true,
  "website_is_mobile_responsive": true,
  "has_online_booking": true,
  "has_live_chat": false,
  "has_blog": true,
  "notes": "Quarterly digital audit"
}
```

### Update Digital Snapshot
```http
PATCH /api/digital-snapshots/{id}
```

**Request Body:** (partial update)
```json
{
  "google_rating": 4.6,
  "google_review_count": 135,
  "notes": "Rating improved after recent reviews"
}
```

### Delete Digital Snapshot
```http
DELETE /api/digital-snapshots/{id}
```

**Note**: Digital snapshots use hard delete (not soft delete) as they are historical data points.

## 📄 Document Templates API

### List Document Templates
```http
GET /api/document-templates?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `document_type` (optional) - Filter by type: `prospect_research`, `campaign_sequence`, `competitive_analysis`, `audit_report`, `proposal`
- `vertical_id` (optional) - Filter by vertical
- `is_active` (optional) - Filter by active status (`true`/`false`)
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/document-templates?organization_id=123&document_type=prospect_research&is_active=true"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "name": "HVAC Prospect Research Template",
      "document_type": "prospect_research",
      "vertical_id": "uuid",
      "template_structure": {
        "sections": [
          { "key": "company_overview", "title": "Company Overview", "required": true },
          { "key": "digital_presence", "title": "Digital Presence Analysis", "required": true },
          { "key": "competitive_landscape", "title": "Competitive Landscape", "required": false }
        ]
      },
      "version": 1,
      "is_active": true,
      "created_at": "2026-02-07T10:00:00Z",
      "verticals": { "name": "HVAC Companies" }
    }
  ],
  "count": 1,
  "error": null
}
```

### Get Single Document Template
```http
GET /api/document-templates/{id}
```

### Create Document Template
```http
POST /api/document-templates
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "name": "Standard Prospect Research",
  "document_type": "prospect_research",
  "vertical_id": "uuid",
  "template_structure": {
    "sections": [
      { "key": "company_overview", "title": "Company Overview", "required": true },
      { "key": "digital_presence", "title": "Digital Presence Analysis", "required": true }
    ]
  },
  "is_active": true
}
```

### Update Document Template
```http
PATCH /api/document-templates/{id}
```

**Request Body:** (partial update)
```json
{
  "version": 2,
  "template_structure": { "sections": [...] }
}
```

### Delete Document Template (Soft Delete)
```http
DELETE /api/document-templates/{id}
```

Sets `deleted_at` timestamp. Returns the deleted record.

---

## 📝 Generated Documents API

### List Generated Documents
```http
GET /api/generated-documents?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `document_type` (optional) - Filter by type: `prospect_research`, `campaign_sequence`, `competitive_analysis`, `audit_report`, `proposal`
- `status` (optional) - Filter by status: `draft`, `in_review`, `approved`, `delivered`, `archived`
- `company_id` (optional) - Filter by company
- `campaign_id` (optional) - Filter by campaign
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/generated-documents?organization_id=123&status=draft&company_id=456"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "document_template_id": "uuid",
      "company_id": "uuid",
      "campaign_id": "uuid",
      "title": "Acme HVAC - Prospect Research",
      "document_type": "prospect_research",
      "status": "draft",
      "content": {
        "company_overview": "Acme HVAC is a ...",
        "digital_presence": { "summary": "..." }
      },
      "readiness_score": 7,
      "version": 1,
      "approved_by": null,
      "approved_at": null,
      "last_generated_at": "2026-02-07T10:00:00Z",
      "created_at": "2026-02-07T10:00:00Z",
      "document_templates": { "name": "HVAC Prospect Research Template" },
      "companies": { "name": "Acme HVAC" },
      "campaigns": { "name": "Acme HVAC Q1 Campaign" },
      "profiles": null
    }
  ],
  "count": 1,
  "error": null
}
```

### Get Single Generated Document
```http
GET /api/generated-documents/{id}
```

**Response includes full template structure, company details, and approver info.**

### Create Generated Document
```http
POST /api/generated-documents
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "document_template_id": "uuid",
  "company_id": "uuid",
  "campaign_id": "uuid",
  "title": "Acme HVAC - Prospect Research",
  "document_type": "prospect_research",
  "status": "draft",
  "content": {},
  "readiness_score": null
}
```

### Update Generated Document
```http
PATCH /api/generated-documents/{id}
```

**Request Body:** (partial update)
```json
{
  "status": "approved",
  "approved_by": "uuid",
  "approved_at": "2026-02-07T15:00:00Z",
  "content": { "company_overview": "Updated content..." },
  "readiness_score": 9
}
```

### Delete Generated Document (Soft Delete)
```http
DELETE /api/generated-documents/{id}
```

Sets `deleted_at` timestamp. Returns the deleted record.

---

## ✉️ Email Templates API

### List Email Templates
```http
GET /api/email-templates?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `playbook_step_id` (optional) - Filter by playbook step
- `target_contact_role` (optional) - Filter by role: `economic_buyer`, `technical_buyer`, `brand_buyer`, `champion`, `any`
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Results offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/email-templates?organization_id=123&target_contact_role=economic_buyer"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "playbook_step_id": "uuid",
      "name": "HVAC Owner Introduction",
      "subject_line": "{{company_name}} - Quick question about your marketing",
      "subject_line_alt": "{{first_name}}, saw your recent Google reviews",
      "body": "Hi {{first_name}},\n\nI noticed {{company_name}} has been...",
      "target_contact_role": "economic_buyer",
      "merge_fields_required": ["first_name", "company_name"],
      "notes": "Best sent Tuesday-Thursday mornings",
      "created_at": "2026-02-07T10:00:00Z",
      "playbook_steps": {
        "title": "Initial Email Outreach",
        "step_number": 2,
        "playbook_template_id": "uuid"
      }
    }
  ],
  "count": 1,
  "error": null
}
```

### Get Single Email Template
```http
GET /api/email-templates/{id}
```

### Create Email Template
```http
POST /api/email-templates
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "playbook_step_id": "uuid",
  "name": "HVAC Owner Introduction",
  "subject_line": "{{company_name}} - Quick question about your marketing",
  "subject_line_alt": "{{first_name}}, saw your recent Google reviews",
  "body": "Hi {{first_name}},\n\nI noticed {{company_name}} has been...",
  "target_contact_role": "economic_buyer",
  "merge_fields_required": ["first_name", "company_name"],
  "notes": "Best sent Tuesday-Thursday mornings"
}
```

### Update Email Template
```http
PATCH /api/email-templates/{id}
```

**Request Body:** (partial update)
```json
{
  "subject_line": "Updated subject line for {{company_name}}",
  "body": "Updated email body...",
  "notes": "Revised based on open rate data"
}
```

### Delete Email Template (Hard Delete)
```http
DELETE /api/email-templates/{id}
```

**Note**: Email templates use hard delete (no `deleted_at` column). This permanently removes the record.

---

## 🏢 Organizations API

### List Organizations
```http
GET /api/organizations
```

**Query Parameters:**
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name or slug
- `type` (string): Filter by 'agency' or 'client'

**Example:**
```bash
curl "http://localhost:3000/api/organizations?type=client&limit=10"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Client Organization",
      "slug": "client-org",
      "type": "client",
      "website": "https://client.com",
      "notes": "Important client",
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z"
    }
  ],
  "success": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Get User's Organizations
```http
GET /api/organizations/my-organizations
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Organization",
      "slug": "my-org",
      "type": "agency"
    }
  ],
  "current_organization_id": "uuid",
  "user_role": "admin",
  "success": true
}
```

### Create Organization
```http
POST /api/organizations
```

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "type": "client",
  "website": "https://example.com",
  "notes": "Organization notes"
}
```

### Update Organization
```http
PATCH /api/organizations/{id}
```

### Delete Organization
```http
DELETE /api/organizations/{id}
```

---

## 📋 Activities API

### List Activities
```http
GET /api/activities
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `campaign_id` (optional) - Filter by campaign
- `status` (optional) - Filter by status: `scheduled`, `completed`, `skipped`, `overdue`
- `channel` (optional) - Filter by channel
- `from_date` (optional) - Filter from date (YYYY-MM-DD)
- `to_date` (optional) - Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "activity_type": "email_sent",
      "channel": "email",
      "scheduled_date": "2026-02-10",
      "status": "scheduled",
      "campaigns": {
        "name": "Acme HVAC Campaign",
        "companies": { "name": "Acme HVAC" }
      }
    }
  ],
  "success": true
}
```

### Update Activity Status
```http
PATCH /api/activities/{id}
```

**Request Body:**
```json
{
  "status": "completed",
  "completed_date": "2026-02-07",
  "outcome": "replied",
  "notes": "Positive response received"
}
```

---

## 📁 Assets API

### List Assets
```http
GET /api/assets?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `asset_type` (optional) - Filter by asset type
- `company_id` (optional) - Filter by company
- `campaign_id` (optional) - Filter by campaign
- `status` (optional) - Filter by status

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Strategic Blueprint",
      "asset_type": "blueprint",
      "status": "delivered",
      "delivered_date": "2026-02-05",
      "companies": { "name": "Acme HVAC" },
      "campaigns": { "name": "Q1 Campaign" }
    }
  ],
  "success": true
}
```

---

## 📊 Results API

### List Results
```http
GET /api/results?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `campaign_id` (optional) - Filter by campaign
- `result_type` (optional) - Filter by result type
- `from_date` (optional) - Filter from date
- `to_date` (optional) - Filter to date

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "result_type": "contract_signed",
      "result_date": "2026-02-07",
      "contract_value_monthly": 5000.00,
      "contract_term_months": 12,
      "total_contract_value": 60000.00,
      "campaigns": {
        "name": "Acme HVAC Campaign",
        "companies": { "name": "Acme HVAC" }
      }
    }
  ],
  "success": true
}
```

---

## 📖 Playbook Templates API

### List Playbook Templates
```http
GET /api/playbook-templates?organization_id=uuid
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "HVAC ABM Sequence",
      "vertical_id": "uuid",
      "total_duration_days": 35,
      "is_active": true,
      "verticals": { "name": "HVAC Companies" }
    }
  ],
  "success": true
}
```

---

## 📝 Playbook Steps API

### List Playbook Steps
```http
GET /api/playbook-steps?organization_id=uuid&playbook_template_id=uuid
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "playbook_template_id": "uuid",
      "step_number": 1,
      "day_offset": 1,
      "channel": "mail",
      "title": "Strategic Blueprint Delivery",
      "asset_type_required": "blueprint",
      "is_pivot_trigger": false
    }
  ],
  "success": true
}
```

---

## 📋 Audit Logs API

### List Audit Logs
```http
GET /api/audit-logs?organization_id=uuid
```

**Query Parameters:**
- `organization_id` (required) - Organization UUID
- `table_name` (optional) - Filter by table
- `action` (optional) - Filter by action: `INSERT`, `UPDATE`, `DELETE`
- `user_id` (optional) - Filter by user
- `from_date` (optional) - Filter from date
- `to_date` (optional) - Filter to date
- `limit` (optional) - Results per page (default: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "table_name": "companies",
      "action": "UPDATE",
      "record_id": "uuid",
      "old_values": { "status": "prospect" },
      "new_values": { "status": "target" },
      "user_id": "uuid",
      "timestamp": "2026-02-07T10:00:00Z",
      "profiles": { "full_name": "John Doe" }
    }
  ],
  "success": true
}
```

**Note**: Audit logs are read-only and automatically generated by database triggers.

---

## 🔍 Error Codes

### Client Errors (4xx)
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Unique constraint violation
- `FORBIDDEN` - Insufficient permissions

### Server Errors (5xx)
- `DATABASE_ERROR` - Database operation failed
- `SERVER_ERROR` - Internal server error
- `NETWORK_ERROR` - Network connectivity issue

### Example Error Response
```json
{
  "error": "Company with this name already exists",
  "code": "DUPLICATE_ENTRY",
  "success": false,
  "details": {
    "field": "name",
    "value": "Acme HVAC"
  }
}
```

## 📝 Request Examples

### JavaScript/Node.js
```javascript
// List companies
const response = await fetch('/api/companies?organization_id=uuid', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const { data, success } = await response.json();

// Create company
const newCompany = await fetch('/api/companies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    organization_id: 'uuid',
    name: 'New Company',
    status: 'prospect'
  })
});
```

### Python
```python
import requests

# List companies
response = requests.get(
    'http://localhost:3000/api/companies',
    params={'organization_id': 'uuid'}
)

data = response.json()

# Create company
new_company = requests.post(
    'http://localhost:3000/api/companies',
    json={
        'organization_id': 'uuid',
        'name': 'New Company',
        'status': 'prospect'
    }
)
```

### cURL
```bash
# List companies
curl -X GET "http://localhost:3000/api/companies?organization_id=uuid" \
  -H "Content-Type: application/json"

# Create company
curl -X POST "http://localhost:3000/api/companies" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "uuid",
    "name": "New Company",
    "status": "prospect"
  }'
```

## 🔄 Bulk Operations

### Bulk Import Format
All bulk import endpoints accept arrays of objects:

```json
{
  "organization_id": "uuid",
  "data": [
    { "name": "Company 1", "status": "prospect" },
    { "name": "Company 2", "status": "target" }
  ]
}
```

### Bulk Response Format
```json
{
  "data": {
    "created": 2,
    "updated": 0,
    "errors": [
      {
        "row": 3,
        "error": "Missing required field: name",
        "data": { "status": "prospect" }
      }
    ]
  },
  "success": true
}
```

## 🚀 Rate Limits

**Current**: No rate limits (MVP phase)
**Future**: 1000 requests per hour per organization

## 📚 SDK & Libraries

### Code Generation
Generate client SDKs using the OpenAPI specification:
- **[OpenAPI Generator](https://openapi-generator.tech/)** - Generate clients for 50+ languages
- **[Swagger Codegen](https://swagger.io/tools/swagger-codegen/)** - Official Swagger code generation tool

### API Testing Tools
- **[Insomnia](https://insomnia.rest/)** - Import OpenAPI spec for testing
- **[Postman](https://www.postman.com/)** - API testing and collaboration
- **[Thunder Client](https://www.thunderclient.com/)** - VS Code extension for API testing

### Official Libraries
- JavaScript/TypeScript SDK (planned)
- Python SDK (planned)

### Community Libraries
- Submit your SDK for inclusion

## 🔮 Future Enhancements

### Planned Features
- **Authentication**: JWT-based auth with role permissions
- **Webhooks**: Real-time event notifications
- **GraphQL**: Alternative query interface
- **Batch Operations**: Efficient bulk processing
- **Real-time**: WebSocket connections for live updates

### API Versioning
- Current: v1 (implicit)
- Future: Explicit versioning (`/api/v2/companies`)

---

## 🔗 Quick Links

- **[Interactive API Documentation](http://localhost:3000/api-docs)** - Test endpoints in your browser
- **[Download OpenAPI Spec](http://localhost:3000/api/openapi.json)** - For code generation and tooling
- **[Getting Started Guide](GETTING_STARTED.md)** - Setup and first steps
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions

For integration support or API questions, please refer to the documentation links above or create an issue in the repository.