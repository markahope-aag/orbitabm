# Getting Started with OrbitABM

This guide will walk you through setting up OrbitABM and getting your first campaign running.

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 18 or higher installed
- A Supabase account (free tier is sufficient to start)
- Basic familiarity with web applications
- Your company and prospect data ready for import

## 🚀 Initial Setup

### 1. Environment Configuration

After cloning the repository and installing dependencies, set up your environment variables:

```bash
# Copy the example environment file
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
# Get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Finding Your Supabase Keys:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the Project URL and anon/public key
4. Copy the service_role key (needed for seeding)

### 2. Database Setup

Run the database migrations in your Supabase project:

**Option 1: Using Supabase CLI (Recommended)**
```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push all 20 migrations to your database
npx supabase db push

# Verify migrations were applied
npx supabase migration list
```

**Option 2: Manual SQL Execution**
1. Open Supabase Dashboard → SQL Editor
2. Execute each migration file in order (001 through 020)
3. Start with `supabase/migrations/001_initial_schema.sql`
4. Continue through all 20 migration files

This creates all necessary tables, indexes, relationships, RLS policies, and security functions.

### 3. Seed Initial Data

Run the seeding scripts to populate your database with foundational data:

```bash
# Seed core data (organizations, markets, verticals, etc.)
npm run seed

# Seed email and document templates
npm run seed:templates
```

This creates:
- 4 sample organizations (Asymmetric Marketing + 3 clients)
- 12 geographic markets
- 15 industry verticals (Tier 1-3)
- 2 PE platforms
- Sample HVAC playbook template
- Email templates for campaign sequences
- Document templates for research and analysis

## 🏢 First-Time User Flow

### Step 1: Access the Application

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. You'll see the dashboard for Asymmetric Marketing

### Step 2: Understand the Interface

**Sidebar Navigation:**
- **Command Center**: Dashboard, Campaign Board, Audit Log
- **Intelligence**: Companies, Markets, Competitors, PE Tracker
- **Operations**: Campaigns, Playbooks, Activities, Assets
- **Documents**: Research Documents, Email Templates, Document Templates
- **Settings**: Verticals, Contacts, Import Data, Organizations
- **API**: Interactive API Documentation (Swagger UI)

**Organization Switcher:**
- Located at the top of the sidebar
- Switch between Asymmetric Marketing and client organizations
- All data is filtered by the selected organization

### Step 3: Import Your Company Data

1. Navigate to **Settings → Import Data**
2. Select "Companies" as the entity type
3. Download the CSV template
4. Fill in your prospect data using the template
5. Upload and map columns
6. Review and import

**CSV Template Fields:**
- `name` (required) - Company name
- `market` - Geographic market (must match existing markets)
- `vertical` - Industry vertical (must match existing verticals)
- `website` - Company website URL
- `estimated_revenue` - Annual revenue estimate
- `employee_count` - Number of employees
- `status` - prospect, target, active_campaign, client, etc.

### Step 4: Set Up Your First Campaign

1. Go to **Operations → Playbooks**
2. Review the sample "HVAC ABM — 35-Day Sequence"
3. Navigate to **Operations → Campaigns**
4. Click "Add Campaign"
5. Fill in the campaign details:
   - **Name**: Descriptive campaign name
   - **Target Company**: Select from imported companies
   - **Playbook**: Choose the HVAC sequence
   - **Start Date**: When to begin outreach
   - **Assigned To**: Campaign owner

### Step 5: Execute Campaign Activities

1. Go to **Command Center → Dashboard**
2. View upcoming activities in the "Upcoming Activities" section
3. Navigate to **Operations → Activities** for detailed activity management
4. Mark activities as complete as you execute them
5. Log outcomes and notes for each touchpoint

## 📊 Understanding Your Data

### Company Management

**Company Statuses:**
- **Prospect**: Identified but not yet targeted
- **Target**: Selected for active outreach
- **Active Campaign**: Currently in a campaign sequence
- **Client**: Successfully converted
- **Lost**: Declined or unresponsive
- **Excluded**: Removed from consideration

**Qualifying Tiers:**
- **Top**: Highest priority prospects
- **Qualified**: Good fit prospects
- **Borderline**: Marginal prospects
- **Excluded**: Not a good fit

### Campaign Execution

**Activity Types:**
- **Mail**: Physical direct mail pieces
- **Email**: Electronic outreach
- **LinkedIn**: Social selling activities
- **Phone**: Voice calls
- **In-Person**: Face-to-face meetings

**Activity Statuses:**
- **Scheduled**: Planned for future execution
- **Completed**: Successfully executed
- **Overdue**: Past due date, needs attention
- **Skipped**: Intentionally bypassed

## 🎯 Best Practices

### Data Management
1. **Keep data clean**: Regularly update company information
2. **Use consistent naming**: Standardize company and contact names
3. **Track everything**: Log all activities and outcomes
4. **Regular snapshots**: Capture digital presence data monthly

### Campaign Execution
1. **Follow playbooks**: Stick to proven sequences
2. **Personalize content**: Customize messages for each target
3. **Track outcomes**: Record responses and engagement
4. **Pivot when needed**: Use pivot triggers to move to next target

### Competitive Intelligence
1. **Monitor regularly**: Check competitor activities monthly
2. **Track PE activity**: Watch for consolidation opportunities
3. **Update digital data**: Refresh digital snapshots quarterly
4. **Share insights**: Keep team informed of competitive changes

## 🔧 Common Tasks

### Adding a New Market
1. Navigate to **Intelligence → Markets**
2. Click "Add Market"
3. Fill in market details (name, state, population)
4. Set PE activity level
5. Save

### Creating a Custom Playbook
1. Go to **Operations → Playbooks**
2. Click "New Playbook"
3. Set name, vertical, and description
4. Add steps with day offsets and channels
5. Define required assets for each step
6. Mark pivot triggers where appropriate

### Importing Contacts
1. Navigate to **Settings → Import Data**
2. Select "Contacts" entity type
3. Map CSV columns to contact fields
4. Ensure company names match existing companies
5. Import and review

### Generating Reports
1. Use **Command Center → Dashboard** for overview metrics
2. Navigate to specific entity pages for detailed data
3. Use export functions to generate CSV reports
4. Filter data by market, vertical, or status as needed

## 🆘 Getting Help

### Common Issues
- **Import errors**: Check CSV format and required fields
- **Missing data**: Verify organization context is correct
- **Campaign not starting**: Ensure all required fields are filled
- **Activities not showing**: Check date filters and status

### Support Resources
- [User Manual](USER_MANUAL.md) - Detailed feature documentation
- [API Documentation](API.md) - For custom integrations
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common problems and solutions
- [Error Handling Guide](ERROR_HANDLING.md) - Understanding system messages

### Next Steps
Once you're comfortable with the basics:
1. Explore the competitive intelligence features
2. Set up automated digital snapshot collection
3. Create custom playbooks for different verticals
4. Integrate with your existing marketing tools
5. Train your team on the platform

---

**Ready to launch your first ABM campaign?** Start with the dashboard and work through your first company import and campaign setup. The platform will guide you through each step with helpful notifications and validation.