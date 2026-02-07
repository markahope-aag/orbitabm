# OrbitABM — Comprehensive App Overview

## What It Is

**OrbitABM** is a **multi-tenant Account-Based Marketing (ABM) campaign intelligence platform** built for marketing agencies and their clients. It centralizes the orchestration, tracking, and analysis of complex ABM campaigns targeting specific companies across multiple markets and verticals.

---

## What It Does

### Core Capabilities

- **Campaign Orchestration** — Execute multi-touch ABM sequences across channels (mail, email, LinkedIn, phone, in-person) using templated playbooks with step-by-step sequences and day offsets
- **Company & Prospect Intelligence** — Track target companies, prospects, contacts, and their relationship status through a pipeline
- **Competitive & PE Tracking** — Monitor competitors and private equity platform consolidation/acquisitions in target markets
- **Digital Presence Snapshots** — Capture point-in-time digital metrics (Google ratings, social followers, SEO, website performance) per company
- **Market & Vertical Analysis** — Organize campaigns by geographic market and industry vertical with tier classifications
- **Multi-Tenant Data Isolation** — Separate data for an agency and multiple client organizations, with an org-switcher in the sidebar
- **Asset Management** — Track campaign materials (blueprints, audits, reports, landing pages, proposals)
- **Dashboard Analytics** — Active campaign counts, pipeline value, overdue activities, at-risk campaigns, market overviews
- **Import/Export** — CSV import with column mapping, validation, and duplicate detection; CSV export for reporting

---

## How It's Constructed

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript 5** |
| UI | **React 19**, **Tailwind CSS 4**, Lucide icons |
| Fonts | Plus Jakarta Sans, JetBrains Mono |
| Database | **Supabase (PostgreSQL)** |
| Auth | Supabase Auth with SSR cookie-based sessions |
| Data Processing | PapaParse (CSV), custom hooks |
| Dev Tools | ESLint 9, Supabase CLI, tsx |

### Directory Structure

```
orbit/
├── src/
│   ├── app/           # Next.js App Router — pages + API routes
│   │   ├── dashboard/         # Command center
│   │   ├── companies/         # Company intelligence
│   │   ├── campaigns/         # Campaign management
│   │   ├── campaign-board/    # Visual campaign board
│   │   ├── playbooks/         # Reusable campaign templates
│   │   ├── activities/        # Individual touchpoints
│   │   ├── markets/           # Geographic markets
│   │   ├── verticals/         # Industry verticals
│   │   ├── competitors/       # Competitive tracking
│   │   ├── pe-tracker/        # PE acquisition tracking
│   │   ├── contacts/          # People at target companies
│   │   ├── assets/            # Campaign materials
│   │   ├── organizations/     # Tenant management
│   │   ├── import/            # CSV import tool
│   │   └── api/               # API routes
│   ├── components/    # Reusable UI (DataTable, SlideOver, Sidebar, etc.)
│   └── lib/           # Core logic
│       ├── supabase/          # Client, server, hooks, queries
│       ├── OrgContext.tsx      # Multi-tenant context provider
│       ├── database.ts        # TypeScript types for all entities
│       ├── errors.ts          # Centralized error handling
│       └── csvExport.ts       # Export utilities
├── supabase/          # 10 migration files defining the full schema
├── scripts/           # Database seeding
└── middleware.ts      # Auth session refresh on every request
```

### Database Schema — 16 Tables + 2 Views

- **organizations**, **profiles** — Multi-tenant user management (admin/manager/viewer roles)
- **companies**, **contacts** — Target account and people tracking
- **markets**, **verticals** — Geographic and industry classification
- **pe_platforms**, **pe_acquisitions** — Private equity consolidation tracking
- **digital_snapshots** — Point-in-time digital metrics per company
- **playbook_templates**, **playbook_steps** — Reusable campaign sequences
- **campaigns**, **campaign_competitors** — Campaign instances and competitive context
- **activities** — Individual touchpoints with status/outcome tracking
- **assets**, **results** — Campaign materials and outcome/contract tracking

All tables use UUID keys, soft deletes (`deleted_at`), auto-updated timestamps, and are scoped by `organization_id` for tenant isolation.

### State Management

- **OrgContext** (React Context) for tenant selection across the app
- **Custom hooks** (`useCompanies`, `useMarkets`, `useCampaigns`, etc.) for data fetching with `{ data, loading, error, refetch }` return patterns
- No centralized store (Redux/Zustand) — component-level state with `useState`
- Optimistic updates with toast notifications for user feedback

### Auth & Authorization

- Supabase Auth with SSR session management via cookies
- Middleware refreshes tokens on every non-static request
- All data queries filtered by the active organization from context
- Role system (admin/manager/viewer) in profiles table
- Row-Level Security planned for Phase 2

---

## Maturity & Roadmap

- **Phase 1** (complete): Core platform, campaigns, playbooks, import/export, dashboard
- **Phase 2** (in progress): Auth flows, advanced RLS, AI content generation, email integration
- **Phase 3** (planned): Mobile, third-party integrations, advanced automation
- **Testing**: Not yet implemented — TypeScript and ESLint provide compile-time safety
- **Deployment**: Designed for Vercel with Supabase cloud; local dev supported via Supabase CLI

---

## Summary

This is a well-structured, domain-specific SaaS application with clean separation of concerns, comprehensive data modeling across 16+ tables, and a modular component architecture. The multi-tenant design and detailed schema (markets, verticals, PE tracking, digital snapshots) show it's purpose-built for ABM agency workflows rather than generic CRM use cases.
