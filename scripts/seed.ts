#!/usr/bin/env tsx

/**
 * OrbitABM Database Seeding Script
 * 
 * Seeds the database with foundational data for the ABM platform:
 * - Organizations (Asymmetric Marketing + clients)
 * - Markets (12 Midwest cities)
 * - Verticals (Tier 1-3 industry verticals)
 * - PE Platforms (TurnPoint Services, Heartland Home Services)
 * - HVAC Playbook Template with 8-step sequence
 * 
 * Usage: npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Import validated environment config
// Note: We need to use process.env directly in scripts since config.ts is for Next.js runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  console.error('\n💡 Make sure your .env.local file contains:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('❌ Invalid NEXT_PUBLIC_SUPABASE_URL format')
  console.error('   Expected: https://your-project.supabase.co')
  console.error('   Received:', supabaseUrl)
  process.exit(1)
}

// Validate service key format (should be a JWT)
if (!supabaseServiceKey.startsWith('eyJ')) {
  console.error('❌ Invalid SUPABASE_SERVICE_ROLE_KEY format')
  console.error('   Expected: JWT token starting with "eyJ"')
  console.error('   Received: [REDACTED]')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SeedData {
  organizations: Array<{
    name: string
    slug: string
    type: 'agency' | 'client'
  }>
  markets: Array<{
    name: string
    state: string
    metro_population: number
  }>
  verticals: Array<{
    name: string
    sector: string
    b2b_b2c: 'B2B' | 'B2C' | 'Both'
    naics_code: string
    revenue_floor: number
    tier: 'tier_1' | 'tier_2' | 'tier_3'
  }>
  pePlatforms: Array<{
    name: string
    parent_firm?: string
    estimated_valuation?: number
    brand_count?: number
  }>
  playbookSteps: Array<{
    step_number: number
    day_offset: number
    channel: 'mail' | 'email' | 'linkedin' | 'phone'
    title: string
    asset_type_required: string
    is_pivot_trigger?: boolean
  }>
}

const seedData: SeedData = {
  organizations: [
    { name: 'Asymmetric Marketing', slug: 'asymmetric', type: 'agency' },
    { name: 'Paper Tube Co', slug: 'paper-tube', type: 'client' },
    { name: 'AviaryAI', slug: 'aviaryai', type: 'client' },
    { name: 'Citrus America', slug: 'citrus-america', type: 'client' }
  ],

  markets: [
    { name: 'Madison', state: 'WI', metro_population: 285300 },
    { name: 'Fort Wayne', state: 'IN', metro_population: 273203 },
    { name: 'Des Moines', state: 'IA', metro_population: 213096 },
    { name: 'Grand Rapids', state: 'MI', metro_population: 200117 },
    { name: 'Chicago', state: 'IL', metro_population: 2721308 },
    { name: 'Indianapolis', state: 'IN', metro_population: 891484 },
    { name: 'Detroit', state: 'MI', metro_population: 645705 },
    { name: 'Milwaukee', state: 'WI', metro_population: 563531 },
    { name: 'Kansas City', state: 'MO', metro_population: 516032 },
    { name: 'Minneapolis', state: 'MN', metro_population: 428579 },
    { name: 'St. Paul', state: 'MN', metro_population: 307465 },
    { name: 'St. Louis', state: 'MO', metro_population: 279695 }
  ],

  verticals: [
    // Tier 1
    { name: 'HVAC Companies', sector: 'Home Services', b2b_b2c: 'B2C', naics_code: '238220', revenue_floor: 2000000, tier: 'tier_1' },
    { name: 'Auto Dealerships', sector: 'Retail', b2b_b2c: 'B2C', naics_code: '441110', revenue_floor: 2000000, tier: 'tier_1' },
    { name: 'Small/Mid Manufacturers', sector: 'Manufacturing', b2b_b2c: 'B2B', naics_code: '31-33', revenue_floor: 3000000, tier: 'tier_1' },
    { name: 'Law Firms', sector: 'Professional Services', b2b_b2c: 'Both', naics_code: '5411', revenue_floor: 3000000, tier: 'tier_1' },
    { name: 'General Contractors', sector: 'Construction', b2b_b2c: 'B2B', naics_code: '236220', revenue_floor: 3000000, tier: 'tier_1' },

    // Tier 2
    { name: 'Plumbing Companies', sector: 'Home Services', b2b_b2c: 'B2C', naics_code: '238220', revenue_floor: 2000000, tier: 'tier_2' },
    { name: 'Electrical Contractors', sector: 'Home Services', b2b_b2c: 'Both', naics_code: '238210', revenue_floor: 2000000, tier: 'tier_2' },
    { name: 'Restaurant Groups', sector: 'Hospitality', b2b_b2c: 'B2C', naics_code: '722511', revenue_floor: 2000000, tier: 'tier_2' },
    { name: 'Wholesale Distributors', sector: 'Distribution', b2b_b2c: 'B2B', naics_code: '42', revenue_floor: 3000000, tier: 'tier_2' },
    { name: 'CPA / Accounting Firms', sector: 'Professional Services', b2b_b2c: 'B2B', naics_code: '5412', revenue_floor: 3000000, tier: 'tier_2' },
    { name: 'Senior Living Facilities', sector: 'Healthcare', b2b_b2c: 'B2C', naics_code: '623110', revenue_floor: 2000000, tier: 'tier_2' },

    // Tier 3
    { name: 'Community Banks / CUs', sector: 'Financial Services', b2b_b2c: 'Both', naics_code: '522110', revenue_floor: 3000000, tier: 'tier_3' },
    { name: 'Property Management', sector: 'Real Estate', b2b_b2c: 'Both', naics_code: '531311', revenue_floor: 3000000, tier: 'tier_3' },
    { name: 'Architecture & Engineering', sector: 'Professional Services', b2b_b2c: 'B2B', naics_code: '5413', revenue_floor: 3000000, tier: 'tier_3' },
    { name: 'Specialty Subcontractors', sector: 'Construction', b2b_b2c: 'B2B', naics_code: '238xxx', revenue_floor: 3000000, tier: 'tier_3' },
    { name: 'Private Schools', sector: 'Education', b2b_b2c: 'B2C', naics_code: '611110', revenue_floor: 2000000, tier: 'tier_3' }
  ],

  pePlatforms: [
    { 
      name: 'TurnPoint Services', 
      parent_firm: 'OMERS Private Equity', 
      estimated_valuation: 2000000000, 
      brand_count: 40 
    },
    { 
      name: 'Heartland Home Services', 
      parent_firm: 'North Branch Capital' 
    }
  ],

  playbookSteps: [
    { step_number: 1, day_offset: 1, channel: 'mail', title: 'Strategic Blueprint Delivery', asset_type_required: 'blueprint' },
    { step_number: 2, day_offset: 3, channel: 'linkedin', title: 'LinkedIn Connection Request', asset_type_required: 'none' },
    { step_number: 3, day_offset: 5, channel: 'email', title: 'Email Follow-Up — Package Reference', asset_type_required: 'none' },
    { step_number: 4, day_offset: 10, channel: 'email', title: 'Website & SEO Audit Delivery', asset_type_required: 'website_audit' },
    { step_number: 5, day_offset: 18, channel: 'email', title: 'Local Market Presence Report', asset_type_required: 'market_report' },
    { step_number: 6, day_offset: 25, channel: 'linkedin', title: 'LinkedIn Content Engagement', asset_type_required: 'none' },
    { step_number: 7, day_offset: 28, channel: 'phone', title: 'The Call', asset_type_required: 'none' },
    { step_number: 8, day_offset: 35, channel: 'mail', title: 'Breakup Note + Pivot', asset_type_required: 'breakup_note', is_pivot_trigger: true }
  ]
}

async function seedOrganizations() {
  console.log('🏢 Seeding organizations...')
  
  const { data, error } = await supabase
    .from('organizations')
    .upsert(
      seedData.organizations.map(org => ({
        name: org.name,
        slug: org.slug,
        type: org.type
      })),
      { onConflict: 'slug' }
    )
    .select()

  if (error) {
    console.error('❌ Error seeding organizations:', error)
    throw error
  }

  console.log(`✓ ${seedData.organizations.length} organizations created/updated`)
  return data
}

async function seedMarkets(asymmetricOrgId: string) {
  console.log('🗺️  Seeding markets...')
  
  const { data, error } = await supabase
    .from('markets')
    .upsert(
      seedData.markets.map(market => ({
        organization_id: asymmetricOrgId,
        name: `${market.name}, ${market.state}`,
        state: market.state,
        metro_population: market.metro_population
      })),
      { onConflict: 'organization_id,name,state' }
    )
    .select()

  if (error) {
    console.error('❌ Error seeding markets:', error)
    throw error
  }

  console.log(`✓ ${seedData.markets.length} markets created/updated`)
  return data
}

async function seedVerticals(asymmetricOrgId: string) {
  console.log('🏭 Seeding verticals...')
  
  const { data, error } = await supabase
    .from('verticals')
    .upsert(
      seedData.verticals.map(vertical => ({
        organization_id: asymmetricOrgId,
        name: vertical.name,
        sector: vertical.sector,
        b2b_b2c: vertical.b2b_b2c,
        naics_code: vertical.naics_code,
        revenue_floor: vertical.revenue_floor,
        tier: vertical.tier
      })),
      { onConflict: 'organization_id,name' }
    )
    .select()

  if (error) {
    console.error('❌ Error seeding verticals:', error)
    throw error
  }

  console.log(`✓ ${seedData.verticals.length} verticals created/updated`)
  return data
}

async function seedPEPlatforms(asymmetricOrgId: string) {
  console.log('💼 Seeding PE platforms...')
  
  const { data, error } = await supabase
    .from('pe_platforms')
    .insert(
      seedData.pePlatforms.map(platform => ({
        organization_id: asymmetricOrgId,
        name: platform.name,
        parent_firm: platform.parent_firm || null,
        estimated_valuation: platform.estimated_valuation || null,
        brand_count: platform.brand_count || null
      }))
    )
    .select()

  if (error) {
    console.error('❌ Error seeding PE platforms:', error)
    throw error
  }

  console.log(`✓ ${seedData.pePlatforms.length} PE platforms created/updated`)
  return data
}

async function seedHVACPlaybook(asymmetricOrgId: string, hvacVerticalId: string) {
  console.log('📋 Seeding HVAC playbook template...')
  
  // Create the playbook template
  const { data: playbook, error: playbookError } = await supabase
    .from('playbook_templates')
    .insert([{
      organization_id: asymmetricOrgId,
      name: 'HVAC ABM — 35-Day Sequence',
      description: 'Comprehensive 35-day outbound sequence for HVAC companies',
      vertical_id: hvacVerticalId,
      is_active: true
    }])
    .select()
    .single()

  if (playbookError) {
    console.error('❌ Error creating playbook template:', playbookError)
    throw playbookError
  }

  console.log('✓ HVAC playbook template created/updated')

  // Create the playbook steps
  const { data: steps, error: stepsError } = await supabase
    .from('playbook_steps')
    .insert(
      seedData.playbookSteps.map(step => ({
        organization_id: asymmetricOrgId,
        playbook_template_id: playbook.id,
        step_number: step.step_number,
        day_offset: step.day_offset,
        channel: step.channel,
        title: step.title,
        description: `Step ${step.step_number} of the HVAC ABM sequence`,
        asset_type_required: step.asset_type_required,
        is_pivot_trigger: step.is_pivot_trigger || false
      }))
    )
    .select()

  if (stepsError) {
    console.error('❌ Error creating playbook steps:', stepsError)
    throw stepsError
  }

  console.log(`✓ ${seedData.playbookSteps.length} playbook steps created/updated`)
  return { playbook, steps }
}

async function main() {
  console.log('🚀 Starting OrbitABM database seeding...\n')

  try {
    // 1. Seed organizations
    const organizations = await seedOrganizations()
    const asymmetricOrg = organizations.find(org => org.slug === 'asymmetric')
    
    if (!asymmetricOrg) {
      throw new Error('Asymmetric Marketing organization not found after seeding')
    }

    // 2. Seed markets (for Asymmetric org)
    await seedMarkets(asymmetricOrg.id)

    // 3. Seed verticals (for Asymmetric org)
    const verticals = await seedVerticals(asymmetricOrg.id)
    const hvacVertical = verticals.find(v => v.name === 'HVAC Companies')
    
    if (!hvacVertical) {
      throw new Error('HVAC vertical not found after seeding')
    }

    // 4. Seed PE platforms (for Asymmetric org)
    await seedPEPlatforms(asymmetricOrg.id)

    // 5. Seed HVAC playbook template and steps
    await seedHVACPlaybook(asymmetricOrg.id, hvacVertical.id)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Import HVAC companies from hvac_prospect_list_4_markets.xlsx')
    console.log('2. Create campaigns and test the full workflow')
    console.log('3. Add contacts and digital snapshots for companies')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding script
main()