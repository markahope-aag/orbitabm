# OrbitABM Scripts

This directory contains utility scripts for managing the OrbitABM database and platform.

## Database Seeding

### `seed.ts` - Bootstrap Platform with Research Data

Seeds the database with foundational data to get the platform ready for use.

**Prerequisites:**
1. Add your Supabase service role key to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   Get this from: Supabase Dashboard > Settings > API > service_role key

**Usage:**
```bash
npm run seed
```

**What it seeds:**
- ✅ **4 Organizations**: Asymmetric Marketing (agency) + 3 clients
- ✅ **12 Markets**: Madison, Fort Wayne, Des Moines, Grand Rapids, Chicago, Indianapolis, Detroit, Milwaukee, Kansas City, Minneapolis, St. Paul, St. Louis
- ✅ **15 Verticals**: Tier 1-3 industry verticals (HVAC, Auto Dealers, Manufacturers, etc.)
- ✅ **2 PE Platforms**: TurnPoint Services (OMERS), Heartland Home Services (North Branch)
- ✅ **HVAC Playbook**: 35-day sequence with 8 steps (blueprint → LinkedIn → email → audit → report → engagement → call → breakup)

**Safe to run multiple times** - uses upsert with conflict resolution.

**Next Steps After Seeding:**
1. Import HVAC companies from `hvac_prospect_list_4_markets.xlsx`
2. Create sample campaigns using the HVAC playbook
3. Add contacts and digital snapshots for companies
4. Test the full ABM workflow

## Future Scripts

Additional scripts will be added for:
- CSV import for companies
- Data export utilities
- Backup and restore operations
- Performance optimization tasks