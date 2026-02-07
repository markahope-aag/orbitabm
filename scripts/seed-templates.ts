#!/usr/bin/env tsx

/**
 * OrbitABM Document Template Seeding Script
 *
 * Seeds 3 default document templates so the Template Management page
 * has real data out of the box.
 *
 * Usage: npm run seed:templates
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TemplateSection {
  section_id: string
  title: string
  type: 'auto' | 'hybrid' | 'manual'
  data_source: string
  prompts: string
}

interface TemplateSeed {
  orgSlug: string
  name: string
  document_type: string
  template_structure: { sections: TemplateSection[] }
}

const templates: TemplateSeed[] = [
  {
    orgSlug: 'asymmetric',
    name: 'HVAC Prospect Research',
    document_type: 'prospect_research',
    template_structure: {
      sections: [
        {
          section_id: 'company_overview',
          title: 'Company Overview',
          type: 'auto',
          data_source: 'companies',
          prompts: 'Summarize the company background, founding year, service area, and number of employees.',
        },
        {
          section_id: 'digital_presence',
          title: 'Digital Presence Audit',
          type: 'auto',
          data_source: 'digital_snapshots',
          prompts: 'Evaluate the company website, SEO ranking, Google Business Profile rating, and social media activity.',
        },
        {
          section_id: 'competitive_landscape',
          title: 'Competitive Landscape',
          type: 'hybrid',
          data_source: 'companies',
          prompts: 'Identify the top 3 local competitors by revenue and market share. Highlight differentiators.',
        },
        {
          section_id: 'pe_exposure',
          title: 'PE / Roll-Up Exposure',
          type: 'auto',
          data_source: 'pe_platforms',
          prompts: 'List any PE-backed competitors in the same market and vertical. Note acquisition risk level.',
        },
        {
          section_id: 'opportunity_assessment',
          title: 'Opportunity Assessment',
          type: 'manual',
          data_source: '',
          prompts: 'Score the prospect on fit (1-10) and outline the recommended engagement strategy.',
        },
      ],
    },
  },
  {
    orgSlug: 'paper-tube',
    name: 'Manufacturing Prospect Brief',
    document_type: 'prospect_research',
    template_structure: {
      sections: [
        {
          section_id: 'company_snapshot',
          title: 'Company Snapshot',
          type: 'auto',
          data_source: 'companies',
          prompts: 'Provide a one-paragraph summary including revenue range, employee count, and primary products.',
        },
        {
          section_id: 'industry_context',
          title: 'Industry Context',
          type: 'hybrid',
          data_source: 'verticals',
          prompts: 'Describe the relevant manufacturing sub-sector, growth trends, and regulatory landscape.',
        },
        {
          section_id: 'key_contacts',
          title: 'Key Contacts',
          type: 'auto',
          data_source: 'contacts',
          prompts: 'List decision-makers with titles, LinkedIn URLs, and last engagement date.',
        },
        {
          section_id: 'recommended_approach',
          title: 'Recommended Approach',
          type: 'manual',
          data_source: '',
          prompts: 'Outline the best outreach channel and messaging angle based on company profile.',
        },
      ],
    },
  },
  {
    orgSlug: 'asymmetric',
    name: 'ABM Campaign Sequence',
    document_type: 'campaign_sequence',
    template_structure: {
      sections: [
        {
          section_id: 'campaign_brief',
          title: 'Campaign Brief',
          type: 'manual',
          data_source: '',
          prompts: 'State the campaign objective, target vertical, and success metrics.',
        },
        {
          section_id: 'audience_segmentation',
          title: 'Audience Segmentation',
          type: 'hybrid',
          data_source: 'companies',
          prompts: 'Define the target account list criteria: revenue range, market, vertical, and PE exposure.',
        },
        {
          section_id: 'sequence_steps',
          title: 'Sequence Steps',
          type: 'auto',
          data_source: 'playbook_steps',
          prompts: 'Generate the step-by-step outreach sequence with channel, day offset, and asset requirements.',
        },
        {
          section_id: 'email_drafts',
          title: 'Email Drafts',
          type: 'hybrid',
          data_source: 'email_templates',
          prompts: 'Produce subject lines and body copy for each email touch. Include merge field placeholders.',
        },
        {
          section_id: 'launch_checklist',
          title: 'Pre-Launch Checklist',
          type: 'manual',
          data_source: '',
          prompts: 'List all items that must be verified before campaign activation.',
        },
      ],
    },
  },
]

async function lookupOrg(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw new Error(`Organization "${slug}" not found. Run "npm run seed" first.`)
  }
  return data.id
}

async function seedDocumentTemplates() {
  console.log('📄 Seeding document templates...\n')

  // Resolve org slugs to IDs
  const orgIds = new Map<string, string>()
  const slugs = [...new Set(templates.map(t => t.orgSlug))]

  for (const slug of slugs) {
    const id = await lookupOrg(slug)
    orgIds.set(slug, id)
    console.log(`  ✓ Found org "${slug}" → ${id}`)
  }

  console.log('')

  let created = 0

  for (const tpl of templates) {
    const orgId = orgIds.get(tpl.orgSlug)!

    // Check if template already exists (by org + name)
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', tpl.name)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      // Update in place
      const { error } = await supabase
        .from('document_templates')
        .update({
          document_type: tpl.document_type,
          template_structure: tpl.template_structure,
          is_active: true,
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`  ❌ Error updating "${tpl.name}":`, error.message)
        throw error
      }
      console.log(`  ↻ Updated "${tpl.name}" (${tpl.document_type})`)
    } else {
      // Insert new
      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: orgId,
          name: tpl.name,
          document_type: tpl.document_type,
          template_structure: tpl.template_structure,
          is_active: true,
        })

      if (error) {
        console.error(`  ❌ Error inserting "${tpl.name}":`, error.message)
        throw error
      }
      console.log(`  ✓ Created "${tpl.name}" (${tpl.document_type})`)
    }
    created++
  }

  console.log(`\n✅ ${created} templates created/updated`)
}

async function main() {
  console.log('🚀 Starting document template seeding...\n')

  try {
    await seedDocumentTemplates()
    console.log('\n🎉 Template seeding completed successfully!')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()
