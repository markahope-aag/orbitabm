# OrbitABM — Build Playbook

## Project Overview

**OrbitABM** is a multi-tenant campaign intelligence platform for Asymmetric Marketing and its clients. Manages ABM campaigns across geographies, verticals, and target companies with competitive intelligence, PE consolidation tracking, multi-touch playbook execution, and outcome measurement.

**App Name:** OrbitABM
**Domain:** orbitabm.com
**Git Repo:** https://github.com/markahope-aag/orbitabm
**Stack:** Next.js 14 (App Router), Supabase (Auth + PostgreSQL + Storage), Tailwind CSS, TypeScript, Vitest

**Approach:** MVP-first. Get working screens fast. Security, testing, polish in Phase 2.

---

## SCHEMA DESIGN

### Entity Relationship Summary

```
Organizations ──< Users (profiles)
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
     │        │       ├──< Campaign Competitors (junction)
     │        │       ├──< Assets
     │        │       └──< Results
     │        │
     └── (all tables carry organization_id for multi-tenancy)
```

### Design Principles

1. **Multi-tenant from day one.** Every table has `organization_id`. Not enforced via RLS yet, but the column is there.
2. **Soft deletes.** Every major entity has `deleted_at`. Queries filter `WHERE deleted_at IS NULL`.
3. **Timestamps on everything.** `created_at` and `updated_at` on all tables.
4. **Companies are polymorphic.** A company can be a target, a competitor, a client, or PE-backed. Role depends on context (campaign assignment), not a fixed type.
5. **Playbooks are templates.** A playbook defines the sequence. A campaign is an instance of a playbook applied to a specific company.
6. **Digital snapshots are point-in-time.** Multiple snapshots per company over time to track change.

---

## CURSOR PROMPT 0 — Project Scaffolding

```
Create a new Next.js 14 project with App Router using the following stack:

- Next.js 14 with App Router (TypeScript)
- Supabase (auth + database) using @supabase/ssr
- Tailwind CSS
- Vitest for testing (configure but don't write tests yet)

Project name: orbit
Git repo: https://github.com/markahope-aag/orbitabm

Setup instructions:
1. npx create-next-app@latest orbit --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
2. cd orbit && git init && git remote add origin https://github.com/markahope-aag/orbitabm.git
3. Install dependencies: @supabase/supabase-js @supabase/ssr
4. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY placeholders
5. Create src/lib/supabase/client.ts for browser client (createBrowserClient)
6. Create src/lib/supabase/server.ts for server client (createServerClient with cookies)
7. Create src/lib/supabase/middleware.ts for session refresh
8. Create middleware.ts at root that refreshes the session on every request
9. Install Vercel CLI: npm i -g vercel
10. Run `vercel link` to connect the project to Vercel (create a new project when prompted, name it "orbit")
11. Connect Vercel to the GitHub repo (https://github.com/markahope-aag/orbitabm) so it auto-deploys on push to main
12. In the Vercel dashboard, link the Supabase project via the Supabase integration (Settings → Integrations → Supabase) — this auto-populates env vars
13. Add the same NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel environment variables if the integration doesn't cover them
14. Initial commit and push to main to verify the deploy pipeline works

Deployment target: Vercel (Hobby tier to start, Pro when we add orbitabm.com custom domain)
Deploy URL will be: https://orbit-[hash].vercel.app (until custom domain is added)

Do NOT set up auth pages yet. Just the plumbing.
Do NOT create any UI beyond the default Next.js page.

Keep it minimal — we're going to build on top of this.
```

---

## CURSOR PROMPT 1 — Database Schema (SQL Migration)

```
Create a Supabase SQL migration file at supabase/migrations/001_initial_schema.sql with the following schema. This is the complete database for an ABM campaign intelligence platform.

IMPORTANT RULES:
- All IDs are uuid DEFAULT gen_random_uuid()
- All tables have created_at (timestamptz DEFAULT now()) and updated_at (timestamptz DEFAULT now())
- All major entities have deleted_at (timestamptz nullable) for soft deletes
- All tables except organizations have organization_id (uuid NOT NULL references organizations)
- Use text for enums (not PostgreSQL enums) so they're easy to extend later
- Add CHECK constraints for enum-like fields
- Create indexes on all foreign keys and commonly filtered columns
- Add a trigger function to auto-update updated_at on row changes
- Apply the trigger to all tables

Here is the complete schema:

---

### organizations
The top-level tenant. Asymmetric Marketing is one org. Each client (Paper Tube Co, AviaryAI, Citrus America) is another.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| type | text | NOT NULL, CHECK (type IN ('agency', 'client')) |
| website | text | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

---

### profiles
Extends Supabase auth.users. Links a user to an organization with a role.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, references auth.users ON DELETE CASCADE |
| organization_id | uuid | NOT NULL, FK organizations |
| role | text | NOT NULL DEFAULT 'viewer', CHECK (role IN ('admin', 'manager', 'viewer')) |
| full_name | text | |
| avatar_url | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

---

### markets
Geographic markets (cities / metro areas).

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| name | text | NOT NULL (city name) |
| state | text | NOT NULL |
| metro_population | integer | |
| market_size_estimate | numeric(12,2) | (estimated annual market size in dollars) |
| pe_activity_level | text | CHECK (pe_activity_level IN ('none', 'low', 'moderate', 'high', 'critical')) |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

Add UNIQUE constraint on (organization_id, name, state).

---

### verticals
Industry verticals (HVAC, Plumbing, Law Firms, etc.)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| name | text | NOT NULL |
| sector | text | (Professional Svcs, Home Services, Construction, etc.) |
| b2b_b2c | text | CHECK (b2b_b2c IN ('B2B', 'B2C', 'Both')) |
| naics_code | text | |
| revenue_floor | numeric(12,2) | (minimum revenue for qualifying prospect) |
| typical_revenue_range | text | |
| typical_marketing_budget_pct | text | |
| key_decision_maker_title | text | |
| tier | text | CHECK (tier IN ('tier_1', 'tier_2', 'tier_3', 'borderline', 'eliminated')) |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

Add UNIQUE constraint on (organization_id, name).

---

### pe_platforms
Private equity consolidation platforms that acquire companies across markets.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| name | text | NOT NULL (e.g., TurnPoint Services) |
| parent_firm | text | (e.g., OMERS Private Equity) |
| estimated_valuation | numeric(14,2) | |
| brand_count | integer | |
| headquarters | text | |
| website | text | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

---

### companies
Both prospects/targets AND competitors. Role is contextual based on campaign assignment.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| name | text | NOT NULL |
| market_id | uuid | FK markets |
| vertical_id | uuid | FK verticals |
| website | text | |
| phone | text | |
| address_line1 | text | |
| address_line2 | text | |
| city | text | |
| state | text | |
| zip | text | |
| estimated_revenue | numeric(14,2) | |
| employee_count | integer | |
| year_founded | integer | |
| ownership_type | text | NOT NULL DEFAULT 'independent', CHECK (ownership_type IN ('independent', 'pe_backed', 'franchise', 'corporate')) |
| pe_platform_id | uuid | FK pe_platforms, nullable |
| qualifying_tier | text | CHECK (qualifying_tier IN ('top', 'qualified', 'borderline', 'excluded')) |
| status | text | NOT NULL DEFAULT 'prospect', CHECK (status IN ('prospect', 'target', 'active_campaign', 'client', 'lost', 'churned', 'excluded')) |
| manufacturer_affiliations | text | (e.g., "Carrier Factory Authorized Dealer") |
| certifications | text | (e.g., "NATE Certified, BBB A+") |
| awards | text | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

Create indexes on: organization_id, market_id, vertical_id, status, qualifying_tier, ownership_type.

---

### contacts
People at target companies.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| company_id | uuid | NOT NULL, FK companies |
| first_name | text | NOT NULL |
| last_name | text | NOT NULL |
| title | text | |
| email | text | |
| phone | text | |
| linkedin_url | text | |
| is_primary | boolean | DEFAULT false |
| relationship_status | text | CHECK (relationship_status IN ('unknown', 'identified', 'connected', 'engaged', 'responsive', 'meeting_held', 'client')) |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

---

### pe_acquisitions
Tracks which companies have been acquired by PE platforms. Links pe_platforms to companies.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| pe_platform_id | uuid | NOT NULL, FK pe_platforms |
| company_id | uuid | NOT NULL, FK companies |
| acquisition_date | date | |
| source_url | text | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |

Add UNIQUE constraint on (pe_platform_id, company_id).

---

### digital_snapshots
Point-in-time capture of a company's digital presence. Multiple per company over time.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| company_id | uuid | NOT NULL, FK companies |
| snapshot_date | date | NOT NULL DEFAULT CURRENT_DATE |
| google_rating | numeric(2,1) | |
| google_review_count | integer | |
| yelp_rating | numeric(2,1) | |
| yelp_review_count | integer | |
| bbb_rating | text | |
| facebook_followers | integer | |
| instagram_followers | integer | |
| linkedin_followers | integer | |
| domain_authority | integer | |
| page_speed_mobile | integer | (0-100) |
| page_speed_desktop | integer | (0-100) |
| organic_keywords | integer | |
| monthly_organic_traffic_est | integer | |
| website_has_ssl | boolean | |
| website_is_mobile_responsive | boolean | |
| has_online_booking | boolean | |
| has_live_chat | boolean | |
| has_blog | boolean | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |

---

### playbook_templates
Defines a reusable multi-touch campaign sequence.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| name | text | NOT NULL |
| vertical_id | uuid | FK verticals, nullable (null = cross-vertical) |
| description | text | |
| total_duration_days | integer | |
| is_active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

---

### playbook_steps
Individual steps within a playbook template.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| playbook_template_id | uuid | NOT NULL, FK playbook_templates ON DELETE CASCADE |
| step_number | integer | NOT NULL |
| day_offset | integer | NOT NULL (days from campaign start) |
| channel | text | NOT NULL, CHECK (channel IN ('mail', 'email', 'linkedin', 'phone', 'in_person', 'other')) |
| title | text | NOT NULL |
| description | text | |
| asset_type_required | text | CHECK (asset_type_required IN ('blueprint', 'website_audit', 'market_report', 'landing_page', 'breakup_note', 'proposal', 'none', null)) |
| is_pivot_trigger | boolean | DEFAULT false (true = if no response by this step, pivot to next target) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Add UNIQUE constraint on (playbook_template_id, step_number).

---

### campaigns
An instance of a playbook applied to a specific target company.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| name | text | NOT NULL |
| company_id | uuid | NOT NULL, FK companies (the target) |
| playbook_template_id | uuid | FK playbook_templates |
| market_id | uuid | NOT NULL, FK markets |
| vertical_id | uuid | NOT NULL, FK verticals |
| status | text | NOT NULL DEFAULT 'planned', CHECK (status IN ('planned', 'active', 'paused', 'completed', 'won', 'lost', 'pivoted')) |
| start_date | date | |
| end_date | date | |
| current_step | integer | (which step we're on) |
| pivot_reason | text | |
| pivot_to_campaign_id | uuid | FK campaigns, nullable (the campaign we pivoted to) |
| assigned_to | uuid | FK profiles, nullable |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

---

### campaign_competitors
Junction table: which competitors are named/referenced in a campaign's materials.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| campaign_id | uuid | NOT NULL, FK campaigns ON DELETE CASCADE |
| company_id | uuid | NOT NULL, FK companies (the competitor) |
| threat_level | text | CHECK (threat_level IN ('critical', 'high', 'medium', 'low')) |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |

Add UNIQUE constraint on (campaign_id, company_id).

---

### activities
Individual touchpoints executed as part of a campaign.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| campaign_id | uuid | NOT NULL, FK campaigns |
| playbook_step_id | uuid | FK playbook_steps, nullable (null = ad hoc activity) |
| contact_id | uuid | FK contacts, nullable |
| activity_type | text | NOT NULL, CHECK (activity_type IN ('letter_sent', 'email_sent', 'linkedin_connect', 'linkedin_message', 'linkedin_engagement', 'phone_call', 'meeting', 'audit_delivered', 'report_delivered', 'landing_page_shared', 'breakup_note', 'proposal_sent', 'other')) |
| channel | text | CHECK (channel IN ('mail', 'email', 'linkedin', 'phone', 'in_person', 'other')) |
| scheduled_date | date | |
| completed_date | date | |
| status | text | NOT NULL DEFAULT 'scheduled', CHECK (status IN ('scheduled', 'completed', 'skipped', 'overdue')) |
| outcome | text | CHECK (outcome IN ('no_response', 'opened', 'clicked', 'replied', 'meeting_booked', 'declined', 'voicemail', 'conversation', null)) |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Create indexes on: campaign_id, status, scheduled_date.

---

### assets
Documents and deliverables created for targets.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| campaign_id | uuid | FK campaigns, nullable |
| company_id | uuid | FK companies, nullable |
| asset_type | text | NOT NULL, CHECK (asset_type IN ('blueprint', 'website_audit', 'market_report', 'landing_page', 'breakup_note', 'proposal', 'presentation', 'other')) |
| title | text | NOT NULL |
| description | text | |
| file_url | text | (Supabase storage URL) |
| landing_page_url | text | |
| status | text | NOT NULL DEFAULT 'draft', CHECK (status IN ('draft', 'ready', 'delivered', 'viewed')) |
| delivered_date | date | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | |

---

### results
Campaign-level outcomes.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK organizations |
| campaign_id | uuid | NOT NULL, FK campaigns |
| result_type | text | NOT NULL, CHECK (result_type IN ('meeting_scheduled', 'proposal_sent', 'proposal_accepted', 'contract_signed', 'contract_lost', 'no_response', 'declined', 'breakup_sent', 'referral_received', 'other')) |
| result_date | date | NOT NULL |
| contract_value_monthly | numeric(10,2) | |
| contract_term_months | integer | |
| total_contract_value | numeric(12,2) | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

---

### Additional SQL to include:

1. Create the updated_at trigger function and apply to all tables.
2. Create a view called `active_campaigns_summary` that joins campaigns with companies, markets, verticals, and shows the current step info.
3. Create a view called `company_latest_snapshot` that returns only the most recent digital_snapshot per company.
4. Seed data: Insert one organization (Asymmetric Marketing, slug: 'asymmetric', type: 'agency') and three client orgs (Paper Tube Co, AviaryAI, Citrus America).

Generate the complete, valid SQL migration file.
```

---

## CURSOR PROMPT 2 — TypeScript Types + Supabase Helpers

```
Based on the database schema in supabase/migrations/001_initial_schema.sql, generate:

1. src/lib/types/database.ts — TypeScript types for every table (Row, Insert, Update variants). Match the Supabase generated types pattern. Include:
   - All table types
   - Enum-like union types for all CHECK constraint fields
   - A Database type that maps table names to their Row/Insert/Update types

2. src/lib/supabase/queries.ts — Basic query helpers for each entity:
   - getAll[Entity](orgId) — returns all non-deleted records for an org
   - get[Entity]ById(id)
   - create[Entity](data)
   - update[Entity](id, data)
   - softDelete[Entity](id) — sets deleted_at = now()

Keep these simple — they just wrap supabase.from().select/insert/update calls.
Don't over-abstract. Each function should be 3-5 lines.

3. src/lib/supabase/hooks.ts — Simple React hooks using useState + useEffect for data fetching. One hook per entity:
   - useMarkets(orgId)
   - useCompanies(orgId, filters?)
   - etc.

Each hook should return { data, loading, error, refetch }.

MVP approach: no caching, no optimistic updates, no error boundaries. Just fetch and render.
```

---

## CURSOR PROMPT 3 — App Layout Shell

```
Create the app layout with a left sidebar navigation. This is a multi-tenant business application for managing ABM campaigns.

File: src/app/layout.tsx
- Wrap the app in a simple context provider that holds the current organization_id (hardcode the Asymmetric Marketing org ID for now — we'll add org switching later)
- Clean, minimal layout with Tailwind

File: src/components/layout/Sidebar.tsx
- Fixed left sidebar, ~250px wide, dark background (slate-900)
- App name at top: "OrbitABM" with a small orbit/ring icon
- Organization name below (hardcoded "Asymmetric Marketing" for now)
- Navigation sections:

  COMMAND CENTER
  - Dashboard (icon: LayoutDashboard)
  - Campaign Board (icon: Kanban)

  INTELLIGENCE
  - Companies (icon: Building2)
  - Markets (icon: MapPin)
  - Competitors (icon: Swords)
  - PE Tracker (icon: TrendingUp)

  OPERATIONS
  - Campaigns (icon: Target)
  - Playbooks (icon: BookOpen)
  - Activities (icon: CheckSquare)
  - Assets (icon: FileText)

  SETTINGS
  - Verticals (icon: Layers)
  - Contacts (icon: Users)
  - Organizations (icon: Building)

Use lucide-react for icons.
Active link should be highlighted.
Use Next.js Link component and usePathname to detect active route.

File: src/app/page.tsx
- Redirect to /dashboard

Create stub pages for each nav item (just the route file with a heading showing the page name):
- src/app/dashboard/page.tsx
- src/app/campaigns/page.tsx
- src/app/campaign-board/page.tsx
- src/app/companies/page.tsx
- src/app/markets/page.tsx
- src/app/competitors/page.tsx
- src/app/pe-tracker/page.tsx
- src/app/playbooks/page.tsx
- src/app/activities/page.tsx
- src/app/assets/page.tsx
- src/app/verticals/page.tsx
- src/app/contacts/page.tsx
- src/app/organizations/page.tsx

Each stub page should just render:
<div className="p-8">
  <h1 className="text-2xl font-bold">[Page Name]</h1>
  <p className="text-gray-500 mt-2">Coming soon</p>
</div>

Make the sidebar collapsible on mobile using a hamburger menu.
```

---

## CURSOR PROMPT 4 — Reusable Data Table Component

```
Create a reusable, generic DataTable component that we'll use across all entity pages.

File: src/components/ui/DataTable.tsx

Props:
- columns: array of { key: string, header: string, width?: string, render?: (row) => ReactNode }
- data: array of objects
- loading: boolean
- onRowClick?: (row) => void
- onAdd?: () => void
- addLabel?: string (default "Add New")
- emptyMessage?: string
- searchable?: boolean (default true)
- searchFields?: string[] (which fields to search across)

Features:
- Search/filter bar at top (filters client-side across searchFields)
- Column headers that are clickable for sorting (client-side)
- Alternating row colors
- Hover state on rows
- Loading skeleton state
- Empty state with message
- "Add New" button in top-right that calls onAdd
- Compact, professional styling with Tailwind
- Responsive — horizontal scroll on small screens

Do NOT add:
- Pagination (MVP — we won't have enough data to need it)
- Column resizing
- Column reordering
- Export functionality

Keep it simple, functional, and reusable.

Also create these small utility components in src/components/ui/:

Badge.tsx — colored badge for status/type fields
  Props: { label: string, color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' }

SlideOver.tsx — right-side slide-over panel for add/edit forms
  Props: { open: boolean, onClose: () => void, title: string, children: ReactNode }

ConfirmDialog.tsx — simple confirmation modal
  Props: { open: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }

StatusBadge.tsx — maps specific status values to colors automatically:
  - 'active', 'client', 'completed', 'won', 'connected' → green
  - 'planned', 'scheduled', 'prospect', 'identified' → blue
  - 'paused', 'borderline', 'overdue' → yellow
  - 'lost', 'churned', 'excluded', 'declined', 'critical' → red
  - everything else → gray
```

---

## CURSOR PROMPT 5 — Markets CRUD Page

```
Build the Markets management page. This is the template for all entity CRUD pages.

File: src/app/markets/page.tsx

This page should:
1. Fetch all markets for the current organization using the useMarkets hook
2. Display them in the DataTable component with columns:
   - Name
   - State
   - Metro Population (formatted with commas)
   - PE Activity Level (as a colored StatusBadge)
   - Notes (truncated to 50 chars)
3. "Add Market" button opens a SlideOver with a form
4. Clicking a row opens the SlideOver in edit mode
5. Edit form has a "Delete" button (soft delete)

Form fields:
- Name (text, required)
- State (text, required)
- Metro Population (number)
- Market Size Estimate (number, formatted as currency)
- PE Activity Level (select: none, low, moderate, high, critical)
- Notes (textarea)

Use simple React state for form management. No form library needed.
On save, call the create/update helper and refetch the data.
On delete, show ConfirmDialog, then soft delete and refetch.

Keep the code straightforward. This pattern will be replicated for every entity.
```

---

## CURSOR PROMPT 6 — Verticals CRUD Page

```
Build the Verticals management page following the exact same pattern as the Markets page.

File: src/app/verticals/page.tsx

DataTable columns:
- Name
- Sector
- B2B/B2C (Badge)
- NAICS Code
- Revenue Floor (formatted as currency)
- Tier (StatusBadge — tier_1 green, tier_2 blue, tier_3 yellow, borderline yellow, eliminated red)
- Key Decision Maker Title

SlideOver form fields:
- Name (text, required)
- Sector (text)
- B2B/B2C (select: B2B, B2C, Both)
- NAICS Code (text)
- Revenue Floor (number)
- Typical Revenue Range (text)
- Typical Marketing Budget % (text)
- Key Decision Maker Title (text)
- Tier (select: tier_1, tier_2, tier_3, borderline, eliminated)
- Notes (textarea)

Same add/edit/delete pattern as Markets.
```

---

## CURSOR PROMPT 7 — Companies CRUD Page

```
Build the Companies page. This is the most important data table in the app.

File: src/app/companies/page.tsx

This page needs more filtering than the others. Add a filter bar above the DataTable with:
- Market filter (dropdown of all markets)
- Vertical filter (dropdown of all verticals)
- Status filter (dropdown: all, prospect, target, active_campaign, client, lost, excluded)
- Ownership filter (dropdown: all, independent, pe_backed, franchise, corporate)
- Qualifying Tier filter (dropdown: all, top, qualified, borderline, excluded)

DataTable columns:
- Name (bold)
- Market (joined from markets table — show market name)
- Vertical (joined from verticals table — show vertical name)
- Est. Revenue (formatted as currency, abbreviated: $5.2M, $800K)
- Employees
- Founded
- Ownership (StatusBadge — independent green, pe_backed red, franchise yellow, corporate gray)
- Status (StatusBadge)
- Qualifying Tier (StatusBadge)

Clicking a row should navigate to /companies/[id] (we'll build that page later).

SlideOver form fields (organized in sections):

BASIC INFO
- Name (text, required)
- Market (select from markets)
- Vertical (select from verticals)
- Website (text)
- Phone (text)

ADDRESS
- Address Line 1 (text)
- Address Line 2 (text)
- City (text)
- State (text)
- Zip (text)

BUSINESS DETAILS
- Estimated Revenue (number)
- Employee Count (number)
- Year Founded (number)
- Ownership Type (select)
- PE Platform (select from pe_platforms, only shown if ownership = pe_backed)
- Manufacturer Affiliations (text)
- Certifications (text)
- Awards (text)

CLASSIFICATION
- Qualifying Tier (select)
- Status (select)
- Notes (textarea)

For the SlideOver form, fetch markets, verticals, and pe_platforms to populate the select dropdowns.
```

---

## CURSOR PROMPT 8 — Company Detail Page

```
Build the Company detail/profile page. This is the most important page in the app — it pulls data from many tables into a single view of one company.

File: src/app/companies/[id]/page.tsx

Layout: Full-width page with a header section and tabbed content below.

HEADER:
- Company name (large)
- Market and Vertical as badges
- Status badge
- Ownership type badge
- Website link (external)
- Quick stats row: Revenue | Employees | Founded | Qualifying Tier
- "Edit" button (opens SlideOver with the same form from the companies page)

TABS (use a simple tab component — build one if needed):

Tab 1: OVERVIEW
- Left column (2/3 width):
  - Business details (affiliations, certifications, awards)
  - Notes
  - Latest digital snapshot (if exists) displayed as a card grid:
    Google Rating/Reviews, Yelp Rating/Reviews, Social followers, DA, Page Speed, etc.
- Right column (1/3 width):
  - Primary contact card (name, title, email, phone, LinkedIn link)
  - Additional contacts list
  - "Add Contact" button

Tab 2: COMPETITIVE LANDSCAPE
- List of other companies in the same market AND same vertical
- Show as a comparison table: Name, Revenue, Employees, Founded, Ownership, Google Rating, Yelp Rating
- Pull latest digital snapshot for each competitor
- Highlight PE-backed companies in red

Tab 3: CAMPAIGNS
- List of all campaigns targeting this company
- Show: Campaign name, Status, Start Date, Current Step, Playbook name
- Clicking a campaign navigates to /campaigns/[id]

Tab 4: DIGITAL HISTORY
- Table of all digital_snapshots for this company, sorted by date desc
- Show change indicators (↑ ↓ —) comparing each snapshot to the previous one
- "Add Snapshot" button opens a form to capture a new snapshot

Tab 5: ASSETS
- List of all assets created for this company
- Show: Title, Type, Status, Delivered Date
- "Add Asset" button

Fetch all related data: company, contacts, campaigns, snapshots, assets, and competitor companies (same market + vertical).
```

---

## CURSOR PROMPT 9 — PE Tracker Page

```
Build the PE Tracker page. This tracks private equity consolidation platforms and their acquisitions.

File: src/app/pe-tracker/page.tsx

Layout: Two sections stacked.

TOP SECTION: PE Platforms
- DataTable showing all PE platforms
- Columns: Name, Parent Firm, Est. Valuation (currency), Brand Count, Headquarters
- "Add Platform" button with SlideOver form

BOTTOM SECTION: Acquisitions Timeline
- When a PE platform row is selected/clicked, show its acquisitions below
- DataTable of pe_acquisitions joined with companies
- Columns: Company Name, Market, Vertical, Acquisition Date, Source URL (as link)
- "Add Acquisition" button — form should let you:
  - Select an existing company from the database OR enter a new company name
  - Select the PE platform (pre-selected if one was clicked above)
  - Acquisition date
  - Source URL
  - Notes

If selecting an existing company, auto-update that company's ownership_type to 'pe_backed' and set its pe_platform_id.

Include a summary stats bar at the top:
- Total PE Platforms tracked
- Total Acquisitions tracked
- Markets with PE Activity (count of unique markets in acquisitions)
```

---

## CURSOR PROMPT 10 — Playbooks CRUD Page

```
Build the Playbooks page for managing campaign sequence templates.

File: src/app/playbooks/page.tsx

Layout: Master-detail. List of playbooks on the left (1/3), selected playbook's steps on the right (2/3).

LEFT PANEL: Playbook List
- List cards showing: Name, Vertical (or "Cross-Vertical"), Duration (X days), Step count, Active/Inactive badge
- "New Playbook" button
- Click to select and show detail on right

RIGHT PANEL: Playbook Detail
When a playbook is selected:

Header:
- Playbook name (editable inline)
- Description (editable)
- Vertical assignment (dropdown)
- Total duration (auto-calculated from steps)
- Active toggle

Steps list (displayed as a vertical timeline):
- Each step shows: Step # | Day X | Channel icon | Title | Asset Required badge
- Steps are displayed in order by step_number
- "Add Step" button at the bottom
- Each step has edit (inline or SlideOver) and delete

Step form fields:
- Step Number (auto-increment)
- Day Offset (number — days from campaign start)
- Channel (select: mail, email, linkedin, phone, in_person, other)
- Title (text, required)
- Description (textarea)
- Asset Type Required (select: blueprint, website_audit, market_report, landing_page, breakup_note, proposal, none)
- Is Pivot Trigger (checkbox — "If no response by this step, pivot to next target")

Seed one playbook: "HVAC ABM — 35-Day Sequence" with these steps:
1. Day 1 | mail | Strategic Blueprint Delivery | blueprint
2. Day 3 | linkedin | LinkedIn Connection Request | none
3. Day 5 | email | Email Follow-Up — Package Reference | none
4. Day 10 | email | Website & SEO Audit Delivery | website_audit
5. Day 18 | email | Local Market Presence Report | market_report
6. Day 25 | linkedin | LinkedIn Content Engagement | none
7. Day 28 | phone | The Call | none
8. Day 35 | mail | Breakup Note + Pivot | breakup_note | is_pivot_trigger: true
```

---

## CURSOR PROMPT 11 — Campaigns Page + Campaign Board

```
Build two views for campaigns:

### FILE 1: src/app/campaigns/page.tsx — Campaign List

DataTable with columns:
- Campaign Name
- Target Company (joined)
- Market (joined)
- Vertical (joined)
- Playbook (joined)
- Status (StatusBadge)
- Start Date
- Current Step (e.g., "Step 3 of 8")
- Assigned To (joined from profiles)

Filter bar:
- Market filter
- Vertical filter
- Status filter (all, planned, active, paused, completed, won, lost, pivoted)

"New Campaign" SlideOver form:
- Campaign Name (text, required)
- Target Company (searchable select from companies)
- Playbook Template (select from playbook_templates)
- Market (auto-filled from selected company, editable)
- Vertical (auto-filled from selected company, editable)
- Start Date (date picker)
- Assigned To (select from profiles)
- Notes (textarea)

When a campaign is created:
- Auto-generate activity records for each step in the selected playbook template
- Set each activity's scheduled_date = campaign start_date + step's day_offset
- Set each activity's status to 'scheduled'
- Set the campaign's current_step to 1

Clicking a row navigates to /campaigns/[id] (detail page — we'll build next).

### FILE 2: src/app/campaign-board/page.tsx — Kanban Board

Display campaigns as a kanban board with columns for each status:
- Planned → Active → Paused → Completed/Won/Lost/Pivoted

Each card shows:
- Target company name (bold)
- Market — Vertical
- Current step info
- Days since start
- Next activity due date
- Assigned to avatar/initial

Cards should be visually compact.
Filter bar at top: Market, Vertical.

Drag-and-drop is NOT required for MVP. Clicking a card navigates to /campaigns/[id].

Cards should be color-coded by how "on track" they are:
- Green border: next activity is in the future
- Yellow border: next activity is today
- Red border: next activity is overdue
```

---

## CURSOR PROMPT 12 — Campaign Detail Page

```
Build the Campaign detail page.

File: src/app/campaigns/[id]/page.tsx

HEADER:
- Campaign name
- Target company name (linked to /companies/[id])
- Market + Vertical badges
- Status badge (large)
- Start date, Days elapsed, Playbook name
- "Edit Campaign" button
- Status change buttons: "Start" (if planned), "Pause" (if active), "Resume" (if paused), "Mark Won", "Mark Lost", "Pivot"

MAIN CONTENT — Two columns:

LEFT COLUMN (2/3):

Activity Timeline:
- Vertical timeline showing all activities for this campaign
- Each activity shows:
  - Step number and day offset
  - Channel icon
  - Title
  - Scheduled date
  - Status: Scheduled (blue), Completed (green), Skipped (gray), Overdue (red pulsing)
  - If completed: outcome badge, completed date, notes
- "Mark Complete" button on each scheduled/overdue activity — opens a small inline form:
  - Completed date (default today)
  - Outcome (select)
  - Notes
- "Add Ad-Hoc Activity" button for unplanned touchpoints

RIGHT COLUMN (1/3):

Target Company Card:
- Company name, website, revenue, employees
- Primary contact (name, title, phone, email, LinkedIn)
- Latest digital snapshot summary (Google rating, review count, DA)

Named Competitors Card:
- List from campaign_competitors
- Each shows: name, threat level badge
- "Add Competitor" button (searchable select from companies in same market)

Results Card:
- List of results logged for this campaign
- "Log Result" button — form:
  - Result type (select)
  - Date
  - Contract value (if applicable)
  - Contract term
  - Notes

Assets Card:
- List of assets created for this campaign
- "Add Asset" button
```

---

## CURSOR PROMPT 13 — Dashboard

```
Build the main dashboard — the "Command Center" that you see when you open the app.

File: src/app/dashboard/page.tsx

LAYOUT: Full width with a grid of cards/sections.

TOP ROW — Key Metrics (4 cards):
1. Active Campaigns — count of campaigns with status 'active'
2. Activities Due This Week — count of activities where scheduled_date is this week and status is 'scheduled'
3. Overdue Activities — count of activities where scheduled_date < today and status is 'scheduled'
4. Pipeline Value — sum of total_contract_value from results where result_type = 'contract_signed'

SECOND ROW — Two equal columns:

Left: UPCOMING ACTIVITIES (next 7 days)
- List of activities with scheduled_date in the next 7 days
- Show: Company name, Activity title, Channel icon, Scheduled date, Campaign name
- Clicking navigates to the campaign detail page
- Sorted by scheduled_date ascending
- Max 10 items with "View All" link to /activities

Right: RECENT RESULTS
- List of the 10 most recent results
- Show: Company name, Result type badge, Date, Contract value (if any)
- Sorted by result_date descending

THIRD ROW — Full width:

CAMPAIGNS BY STATUS
- Simple horizontal bar chart or stacked summary showing campaign counts by status
- Use colored segments: planned (blue), active (green), paused (yellow), won (emerald), lost (red), pivoted (purple)
- Can be a simple CSS bar chart — no charting library needed for MVP

FOURTH ROW — Two equal columns:

Left: MARKETS OVERVIEW
- Table: Market name, Active campaigns count, Total companies count, PE activity level
- Sorted by active campaign count desc

Right: CAMPAIGNS AT RISK
- List of active campaigns where the next scheduled activity is overdue
- Show: Company name, Days overdue, Last completed activity, Campaign name
- Red highlight

All data scoped to current organization_id.
Keep queries simple — use the Supabase client directly in the page (server component) or hooks.
```

---

## CURSOR PROMPT 14 — Contacts, Activities, and Assets Pages

```
Build the remaining three entity management pages. These all follow the same pattern as Markets/Verticals.

### FILE 1: src/app/contacts/page.tsx

DataTable columns:
- Name (first + last)
- Company (joined)
- Title
- Email
- Phone
- LinkedIn (as icon/link)
- Relationship Status (StatusBadge)
- Primary (checkmark icon)

Filter: Company, Relationship Status
SlideOver form: first_name, last_name, company (select), title, email, phone, linkedin_url, is_primary, relationship_status (select), notes

### FILE 2: src/app/activities/page.tsx

DataTable columns:
- Scheduled Date
- Company (from campaign → company join)
- Campaign Name
- Activity Type (Badge)
- Channel (icon)
- Status (StatusBadge)
- Outcome (StatusBadge, if completed)
- Contact (joined, if assigned)

Filter: Status (scheduled, completed, skipped, overdue), Channel, Date Range (this week, next week, this month, custom)
Default filter: show scheduled + overdue for current and next week

The "Mark Complete" inline action should be available from this list view too.

### FILE 3: src/app/assets/page.tsx

DataTable columns:
- Title
- Type (Badge)
- Company (joined)
- Campaign (joined)
- Status (StatusBadge)
- Delivered Date

SlideOver form: title, asset_type (select), company (select), campaign (select), description, file_url, landing_page_url, status (select), delivered_date, notes
```

---

## CURSOR PROMPT 15 — Organization Switcher + Competitors View

```
Build two final features:

### FILE 1: Update src/components/layout/Sidebar.tsx — Organization Switcher

Add an organization dropdown/switcher at the top of the sidebar (below app name):
- Fetch all organizations
- Show current org name
- Dropdown to switch between orgs
- Store selected org_id in a React context (src/lib/context/OrgContext.tsx)
- All pages should read org_id from this context
- When org changes, all data refetches

For now, show all orgs in the dropdown (no permission check — MVP).
The org context should provide: { currentOrgId, currentOrg, setCurrentOrgId, organizations }

### FILE 2: src/app/competitors/page.tsx — Competitive Intelligence View

This is different from the companies page. It's organized by MARKET and shows competitive landscapes.

Layout:
- Market selector at top (dropdown)
- When a market is selected, show all companies in that market grouped by vertical
- For each vertical group:
  - Section header: Vertical name
  - Comparison table of companies:
    - Company name
    - Revenue
    - Employees
    - Ownership (badge)
    - Google Rating + Reviews (from latest snapshot)
    - Yelp Rating + Reviews
    - Domain Authority
    - Instagram Followers
    - Status (are they a campaign target? client? excluded?)
  - Highlight PE-backed companies with red row background
  - Highlight active campaign targets with green row background

This view lets you see at a glance: "In Fort Wayne HVAC, here's everyone, here's who we're targeting, here's who's PE-backed, and here's the digital gap between them."
```

---

## CURSOR PROMPT 16 — Data Import (CSV Upload) + API Routes

```
Build a data import system so we can bulk-load companies, contacts, markets, verticals, and digital snapshots from CSV files instead of typing every record manually. Also create lightweight API routes for programmatic data access.

### PART 1: CSV Import Page

File: src/app/import/page.tsx

Layout:
- Page title: "Data Import"
- Step 1: Select entity type (dropdown: Companies, Contacts, Markets, Verticals, PE Platforms, Digital Snapshots)
- Step 2: Upload CSV file (drag-and-drop zone + file picker)
- Step 3: Column mapping — show a preview table of the first 5 rows, with dropdowns above each column to map CSV headers to database fields
- Step 4: Preview & confirm — show how many records will be created, flag any validation issues (missing required fields, duplicate names)
- Step 5: Import — progress bar, then summary (X created, Y skipped, Z errors)

For each entity type, define the expected/mappable fields:

**Companies:**
- name (required), market (match by name → market_id), vertical (match by name → vertical_id), website, phone, address_line1, address_line2, city, state, zip, estimated_revenue, employee_count, year_founded, ownership_type, qualifying_tier, status, manufacturer_affiliations, certifications, awards, notes

**Contacts:**
- first_name (required), last_name (required), company (match by name → company_id), title, email, phone, linkedin_url, is_primary, relationship_status, notes

**Markets:**
- name (required), state (required), metro_population, market_size_estimate, pe_activity_level, notes

**Verticals:**
- name (required), sector, b2b_b2c, naics_code, revenue_floor, typical_revenue_range, typical_marketing_budget_pct, key_decision_maker_title, tier, notes

**Digital Snapshots:**
- company (match by name → company_id, required), snapshot_date, google_rating, google_review_count, yelp_rating, yelp_review_count, bbb_rating, facebook_followers, instagram_followers, linkedin_followers, domain_authority, page_speed_mobile, page_speed_desktop, organic_keywords, monthly_organic_traffic_est, has_blog, has_online_booking, has_live_chat, notes

Key behaviors:
- Use Papaparse (npm install papaparse) for CSV parsing client-side
- For lookup fields (market, vertical, company), match by name case-insensitively. If no match found, flag the row in yellow and let the user choose: skip, create new, or manually assign.
- Detect duplicates by name within the same organization. Offer: skip duplicates or update existing.
- All imported records get the current organization_id automatically.
- Show a downloadable CSV template for each entity type (pre-filled with the correct headers and one example row).

File: src/components/import/CsvUploader.tsx — reusable upload + parse component
File: src/components/import/ColumnMapper.tsx — column mapping UI
File: src/components/import/ImportPreview.tsx — preview with validation flags

### PART 2: CSV Export

Add an "Export CSV" button to every DataTable page (Companies, Contacts, Markets, Verticals, etc.):
- Exports the currently filtered/visible data as a CSV download
- Uses the same column structure as the import template so round-tripping works
- File named: {entity}_{org-slug}_{date}.csv (e.g., companies_asymmetric_2026-02-07.csv)

File: src/lib/utils/csvExport.ts — utility function that takes column definitions + data array and triggers a download

### PART 3: API Routes

Create Next.js API routes for programmatic CRUD access. These are simple wrappers around Supabase queries — no auth enforcement yet (MVP).

File structure:
- src/app/api/companies/route.ts — GET (list, with query params for filtering) + POST (create)
- src/app/api/companies/[id]/route.ts — GET (single) + PATCH (update) + DELETE (soft delete)
- src/app/api/companies/import/route.ts — POST (bulk create from JSON array)
- src/app/api/contacts/route.ts — GET + POST
- src/app/api/contacts/[id]/route.ts — GET + PATCH + DELETE
- src/app/api/markets/route.ts — GET + POST
- src/app/api/markets/[id]/route.ts — GET + PATCH + DELETE
- src/app/api/verticals/route.ts — GET + POST
- src/app/api/verticals/[id]/route.ts — GET + PATCH + DELETE
- src/app/api/campaigns/route.ts — GET + POST
- src/app/api/campaigns/[id]/route.ts — GET + PATCH + DELETE
- src/app/api/digital-snapshots/route.ts — GET + POST
- src/app/api/digital-snapshots/[id]/route.ts — GET + PATCH + DELETE

Each route should:
- Accept organization_id as a query parameter (required for GET list endpoints)
- Return JSON with { data, error, count } structure
- Support basic filtering via query params (e.g., GET /api/companies?organization_id=xxx&market_id=yyy&status=active)
- The bulk import endpoint (/api/companies/import) accepts a JSON array and inserts all records in a single Supabase call, returning { created: N, errors: [...] }

Keep routes simple — 20-30 lines each. No middleware, no validation library, no error classes. Just parse the request, call Supabase, return the result.

### PART 4: Add Import to Navigation

Update src/components/layout/Sidebar.tsx:
- Add "Import Data" under the SETTINGS section (icon: Upload)
- Route: /import
```

---

## CURSOR PROMPT 17 — Seed Data Script

```
Create a seed data script that loads all the HVAC vertical research we've already completed into the database. This runs once to bootstrap the platform with real data.

File: scripts/seed.ts (run with: npx tsx scripts/seed.ts)

The script should:
1. Read NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local (use service role key to bypass RLS)
2. Insert data in dependency order: organizations → markets → verticals → pe_platforms → companies → contacts → pe_acquisitions → playbook_templates → playbook_steps
3. Use upsert (ON CONFLICT DO NOTHING) so it's safe to run multiple times
4. Log progress: "✓ 4 organizations created" etc.

Seed this data:

**Organizations:**
- Asymmetric Marketing (slug: asymmetric, type: agency)
- Paper Tube Co (slug: paper-tube, type: client)
- AviaryAI (slug: aviaryai, type: client)
- Citrus America (slug: citrus-america, type: client)

**Markets (org: Asymmetric):**
- Madison, WI, 285300
- Fort Wayne, IN, 273203
- Des Moines, IA, 213096
- Grand Rapids, MI, 200117
- Chicago, IL, 2721308
- Indianapolis, IN, 891484
- Detroit, MI, 645705
- Milwaukee, WI, 563531
- Kansas City, MO, 516032
- Minneapolis, MN, 428579
- St. Paul, MN, 307465
- St. Louis, MO, 279695

**Verticals (org: Asymmetric) — Tier 1:**
- HVAC Companies (sector: Home Services, B2C, NAICS: 238220, floor: 2000000, tier: tier_1)
- Auto Dealerships (sector: Retail, B2C, NAICS: 441110, floor: 2000000, tier: tier_1)
- Small/Mid Manufacturers (sector: Manufacturing, B2B, NAICS: 31-33, floor: 3000000, tier: tier_1)
- Law Firms (sector: Professional Svcs, B2B/B2C, NAICS: 5411, floor: 3000000, tier: tier_1)
- General Contractors (sector: Construction, B2B, NAICS: 236220, floor: 3000000, tier: tier_1)

**Verticals — Tier 2:**
- Plumbing Companies (Home Services, B2C, 238220, 2000000)
- Electrical Contractors (Home Services, B2C/B2B, 238210, 2000000)
- Restaurant Groups (Hospitality, B2C, 722511, 2000000)
- Wholesale Distributors (Distribution, B2B, 42, 3000000)
- CPA / Accounting Firms (Professional Svcs, B2B, 5412, 3000000)
- Senior Living Facilities (Healthcare, B2C, 623110, 2000000)

**Verticals — Tier 3:**
- Community Banks / CUs (Financial Svcs, B2C/B2B, 522110, 3000000)
- Property Management (Real Estate, B2B/B2C, 531311, 3000000)
- Architecture & Engineering (Professional Svcs, B2B, 5413, 3000000)
- Specialty Subcontractors (Construction, B2B, 238xxx, 3000000)
- Private Schools (Education, B2C, 611110, 2000000)

**PE Platforms (org: Asymmetric):**
- TurnPoint Services (parent: OMERS Private Equity, valuation: 2000000000, brands: 40+)
- Heartland Home Services (parent: North Branch Capital)

**Playbook Template: "HVAC ABM — 35-Day Sequence" (org: Asymmetric, vertical: HVAC)**
Steps:
1. Day 1 | mail | Strategic Blueprint Delivery | blueprint
2. Day 3 | linkedin | LinkedIn Connection Request | none
3. Day 5 | email | Email Follow-Up — Package Reference | none
4. Day 10 | email | Website & SEO Audit Delivery | website_audit
5. Day 18 | email | Local Market Presence Report | market_report
6. Day 25 | linkedin | LinkedIn Content Engagement | none
7. Day 28 | phone | The Call | none
8. Day 35 | mail | Breakup Note + Pivot | breakup_note | is_pivot_trigger: true

NOTE: Do NOT seed individual HVAC companies here — those will come via CSV import from the existing prospect spreadsheet (hvac_prospect_list_4_markets.xlsx). The import tool from Prompt 16 handles that.

Install tsx as a dev dependency: npm install -D tsx
Add script to package.json: "seed": "tsx scripts/seed.ts"
```

---

## PHASE 2 (LATER) — Noted but Not Built Yet

These are things we'll come back to. Listing them so we don't forget:

- [ ] Supabase Auth — login/signup flow, protected routes
- [ ] Row-Level Security policies on all tables
- [ ] Role-based access (admin/manager/viewer permissions)
- [ ] Client portal view (read-only for client orgs)
- [ ] AI integration — generate blueprints, audits, reports from company data
- [ ] Landing page generator — build personalized landing pages from templates
- [ ] Email integration — send outreach directly from the platform
- [ ] File upload to Supabase Storage for assets
- [ ] Notifications — overdue activity alerts
- [ ] Real-time updates via Supabase subscriptions
- [ ] Proper error handling and loading states
- [ ] Input validation (Zod schemas)
- [ ] Unit and integration tests (Vitest)
- [ ] Mobile-responsive polish
- [ ] Performance optimization (React.memo, pagination for large datasets)
- [ ] Audit log — track who changed what when
- [ ] Custom domain — connect orbitabm.com to Vercel (requires Pro plan, $20/mo)

---

## SEED DATA NOTES

When the app is running, the first thing to do is enter the data we already have:

**Organizations:**
- Asymmetric Marketing (agency)
- Paper Tube Co (client)
- AviaryAI (client)
- Citrus America (client)

**Markets (for Asymmetric — HVAC vertical):**
- Madison, WI (285,300 pop)
- Fort Wayne, IN (273,203)
- Des Moines, IA (213,096)
- Grand Rapids, MI (200,117)
- Chicago, IL (2,721,308)
- Indianapolis, IN (891,484)
- Detroit, MI (645,705)
- Milwaukee, WI (563,531)
- Kansas City, MO (516,032)
- Minneapolis, MN (428,579)
- St. Paul, MN (307,465)
- St. Louis, MO (279,695)

**Verticals (Tier 1):** HVAC, Auto Dealers, Manufacturers, Law Firms, General Contractors
**PE Platforms:** TurnPoint Services (OMERS), Heartland Home Services (North Branch Capital)

**Companies:** The 53 HVAC companies from the prospect spreadsheet we already built.

We can build a seed script later or enter via the UI once it's running.
