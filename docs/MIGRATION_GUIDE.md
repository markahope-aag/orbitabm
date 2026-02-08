# OrbitABM Migration Guide

This guide covers database migrations, version upgrades, and data migration procedures for OrbitABM.

## 🗄️ Database Migration System

OrbitABM uses Supabase migrations to manage database schema changes. All migrations are stored in the `supabase/migrations/` directory and are applied in sequential order.

### Migration Files Overview

```
supabase/migrations/
├── 001_initial_schema.sql          # Core database schema
├── 002_document_intelligence.sql   # Document system tables
├── 003_enable_rls_security.sql     # Row Level Security policies
├── 004_fix_security_definer_views.sql
├── 005_fix_function_search_paths.sql
├── 006_alter_function_search_paths.sql
├── 007_verify_function_security.sql
├── 008_schema_fixes.sql
├── 009_fix_security_definer_views.sql
├── 010_recreate_functions_with_search_path.sql
├── 011_profile_creation_trigger.sql
├── 012_email_templates_campaign_scope.sql
└── 013_audit_logs.sql              # Latest: Audit logging system
```

## 🚀 Running Migrations

### Prerequisites

1. **Supabase CLI Installation:**
   ```bash
   npm install -g supabase
   ```

2. **Project Linking:**
   ```bash
   # Link to your Supabase project
   npx supabase link --project-ref your-project-ref
   ```

3. **Environment Setup:**
   ```bash
   # Ensure .env.local has correct Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Migration Commands

**Apply All Pending Migrations:**
```bash
npx supabase db push
```

**Check Migration Status:**
```bash
npx supabase migration list
```

**Create New Migration:**
```bash
npx supabase migration new migration_name
```

**Reset Database (Development Only):**
```bash
npx supabase db reset
```

## 📊 Migration History

### Version 2.1.0 Migrations

#### Migration 013: Audit Logs System
**File:** `013_audit_logs.sql`
**Purpose:** Comprehensive audit logging for all user actions

**Changes:**
- Added `audit_logs` table with comprehensive event tracking
- Added audit triggers for all major tables
- Enhanced security with audit trail capabilities

**Manual Steps Required:**
None - migration is fully automated.

**Rollback Procedure:**
```sql
-- Remove audit triggers
DROP TRIGGER IF EXISTS audit_trigger ON companies;
DROP TRIGGER IF EXISTS audit_trigger ON campaigns;
-- ... (repeat for all tables)

-- Drop audit function
DROP FUNCTION IF EXISTS audit_trigger_function();

-- Drop audit table
DROP TABLE IF EXISTS audit_logs;
```

#### Migration 012: Email Templates Campaign Scope
**File:** `012_email_templates_campaign_scope.sql`
**Purpose:** Enhanced email template system with campaign-specific templates

**Changes:**
- Added campaign-scoped email templates
- Enhanced merge field support
- Improved template organization

### Version 2.0.0 Migrations

#### Migration 002: Document Intelligence System
**File:** `002_document_intelligence.sql`
**Purpose:** AI-powered document generation system

**Changes:**
- Added `document_templates` table
- Added `generated_documents` table
- Added `email_templates` table
- Enhanced campaign management with document integration

**Data Migration Required:**
```sql
-- Migrate existing campaign data to use document templates
UPDATE campaigns 
SET research_doc_id = NULL, sequence_doc_id = NULL 
WHERE research_doc_id IS NOT NULL OR sequence_doc_id IS NOT NULL;
```

### Version 1.5.0 Migrations

#### Migration 003: Row Level Security
**File:** `003_enable_rls_security.sql`
**Purpose:** Comprehensive security implementation

**Changes:**
- Enabled RLS on all tables
- Created security helper functions
- Implemented organization-scoped access policies

**Post-Migration Steps:**
1. Verify all users have proper organization assignments
2. Test data access with different user contexts
3. Update application code to handle RLS policies

## 🔧 Manual Migration Procedures

### Fresh Installation

For a completely new installation:

1. **Create Supabase Project:**
   ```bash
   # Create new project at supabase.com
   # Note the project reference ID
   ```

2. **Initialize Local Environment:**
   ```bash
   npx supabase init
   npx supabase link --project-ref your-project-ref
   ```

3. **Apply All Migrations:**
   ```bash
   npx supabase db push
   ```

4. **Seed Initial Data:**
   ```bash
   npm run seed
   ```

### Upgrading Existing Installation

For upgrading an existing OrbitABM installation:

1. **Backup Database:**
   ```bash
   # Create backup before migration
   npx supabase db dump --db-url "postgresql://..." > backup_$(date +%Y%m%d).sql
   ```

2. **Check Current Migration Status:**
   ```bash
   npx supabase migration list
   ```

3. **Apply Pending Migrations:**
   ```bash
   npx supabase db push
   ```

4. **Verify Migration Success:**
   ```bash
   # Check that all tables exist and have correct structure
   npx supabase db diff --schema public
   ```

5. **Update Application Code:**
   ```bash
   # Pull latest code changes
   git pull origin main
   npm install
   npm run build
   ```

## 🔄 Data Migration Procedures

### Migrating Between Environments

**Development to Staging:**
```bash
# Export data from development
npx supabase db dump --data-only > dev_data.sql

# Import to staging (after schema migration)
psql "postgresql://staging-connection-string" < dev_data.sql
```

**Staging to Production:**
```bash
# Export production-ready data
npx supabase db dump --data-only --exclude-table-data=audit_logs > prod_data.sql

# Apply to production (after schema migration)
psql "postgresql://production-connection-string" < prod_data.sql
```

### Organization Data Migration

When migrating data between organizations:

```sql
-- Create new organization
INSERT INTO organizations (id, name, slug, type) 
VALUES ('new-org-id', 'New Organization', 'new-org', 'client');

-- Migrate companies (example)
INSERT INTO companies (organization_id, name, market_id, vertical_id, status)
SELECT 'new-org-id', name, market_id, vertical_id, status
FROM companies 
WHERE organization_id = 'source-org-id';

-- Update foreign key references as needed
-- Repeat for other entities (contacts, campaigns, etc.)
```

### Bulk Data Import

For large data imports:

```sql
-- Temporarily disable triggers for performance
ALTER TABLE companies DISABLE TRIGGER ALL;

-- Bulk insert data
COPY companies (organization_id, name, market_id, vertical_id, status)
FROM '/path/to/data.csv' 
WITH (FORMAT csv, HEADER true);

-- Re-enable triggers
ALTER TABLE companies ENABLE TRIGGER ALL;

-- Update sequences if needed
SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies));
```

## 🛠️ Troubleshooting Migrations

### Common Migration Issues

#### Issue: Migration Fails Due to Data Conflicts
**Symptoms:** Migration fails with constraint violation errors
**Solution:**
```sql
-- Check for constraint violations
SELECT * FROM companies WHERE organization_id IS NULL;

-- Fix data before re-running migration
UPDATE companies SET organization_id = 'default-org-id' WHERE organization_id IS NULL;
```

#### Issue: RLS Policies Block Application Access
**Symptoms:** Application returns empty data or access denied errors
**Solution:**
```sql
-- Temporarily disable RLS for debugging
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Check data access
SELECT * FROM companies LIMIT 5;

-- Re-enable RLS and fix policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
```

#### Issue: Function Security Warnings
**Symptoms:** Database logs show search path warnings
**Solution:**
```sql
-- Update function with explicit search path
CREATE OR REPLACE FUNCTION function_name()
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body
END;
$$;
```

### Migration Recovery Procedures

#### Rollback Failed Migration
```bash
# If migration fails, you may need to manually rollback
# Check migration status
npx supabase migration list

# Manually revert changes in database
psql "postgresql://connection-string" -c "
  -- Rollback SQL commands
  DROP TABLE IF EXISTS new_table;
  ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
"

# Mark migration as not applied (if needed)
# This requires manual intervention in supabase_migrations table
```

#### Restore from Backup
```bash
# Restore from backup if migration causes issues
psql "postgresql://connection-string" < backup_file.sql

# Re-apply migrations one by one
npx supabase migration up --target 012
npx supabase migration up --target 013
```

## 📋 Pre-Migration Checklist

Before running any migration:

- [ ] **Backup Database:** Create full backup of current database
- [ ] **Test in Development:** Run migration in development environment first
- [ ] **Check Dependencies:** Ensure all required data exists
- [ ] **Verify Permissions:** Confirm database user has required permissions
- [ ] **Plan Downtime:** Schedule maintenance window if needed
- [ ] **Prepare Rollback:** Have rollback procedure ready
- [ ] **Monitor Resources:** Ensure sufficient database resources
- [ ] **Notify Team:** Inform team members of migration schedule

## 📋 Post-Migration Checklist

After running migration:

- [ ] **Verify Schema:** Check that all tables and columns exist
- [ ] **Test Application:** Verify application functionality
- [ ] **Check Data Integrity:** Ensure data is consistent and complete
- [ ] **Verify Security:** Test RLS policies and access controls
- [ ] **Monitor Performance:** Check for any performance regressions
- [ ] **Update Documentation:** Document any manual steps taken
- [ ] **Clean Up:** Remove any temporary migration artifacts

## 🔍 Migration Monitoring

### Performance Monitoring
```sql
-- Monitor migration progress for large tables
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public';

-- Check table sizes after migration
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Security Verification
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 📞 Support and Escalation

### When to Seek Help

- Migration fails with unrecoverable errors
- Data corruption is suspected
- Performance significantly degrades after migration
- Security policies are not working as expected
- Application functionality is broken after migration

### Information to Provide

When reporting migration issues:

1. **Migration file name and version**
2. **Error messages (full text)**
3. **Database logs**
4. **Application logs**
5. **Environment details (dev/staging/prod)**
6. **Steps taken before the issue**
7. **Current database state**

---

This migration guide ensures safe and reliable database updates for OrbitABM. Always test migrations in development environments before applying to production.