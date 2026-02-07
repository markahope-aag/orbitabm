import type { CompanyRow, ContactRow, DigitalSnapshotRow, MarketRow, VerticalRow } from '@/lib/types/database'

// JSONB content shape stored in generated_documents.content
export interface SectionContent {
  content: string
  source: 'auto_generated' | 'human_edited'
  updated_at: string
}

export interface ResearchContent {
  sections: Record<string, SectionContent>
  readiness_checks: Record<string, boolean>
  readiness_score: number
}

// Section definitions
export interface SectionDefinition {
  id: string
  title: string
  type: 'auto' | 'manual' | 'hybrid' | 'calculated'
  order: number
  placeholder?: string
}

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: 'company_overview',
    title: '1. Company Overview',
    type: 'auto',
    order: 1,
  },
  {
    id: 'market_context',
    title: '2. Market Context & Opportunity',
    type: 'manual',
    order: 2,
    placeholder: 'Describe the market dynamics, growth trends, and opportunity this company represents.\n\n- What macro trends affect this vertical?\n- How is the competitive landscape shifting?\n- What is the total addressable market?',
  },
  {
    id: 'value_proposition',
    title: '3. Value Proposition & Wedge',
    type: 'manual',
    order: 3,
    placeholder: 'Define the primary value proposition and entry wedge for this prospect.\n\n- What specific pain point can we address?\n- What is our unique angle vs. competitors?\n- What proof points support our approach?',
  },
  {
    id: 'competitive_landscape',
    title: '4. Competitive Landscape',
    type: 'auto',
    order: 4,
  },
  {
    id: 'decision_making_unit',
    title: '5. Decision-Making Unit (DMU)',
    type: 'hybrid',
    order: 5,
  },
  {
    id: 'engagement_strategy',
    title: '6. Engagement Strategy',
    type: 'manual',
    order: 6,
    placeholder: 'Outline the multi-channel engagement strategy for this prospect.\n\n- Which channels will be primary (mail, email, LinkedIn, phone)?\n- What is the recommended cadence?\n- What triggers should prompt escalation or pivot?',
  },
  {
    id: 'objection_handling',
    title: '7. Objection Handling',
    type: 'manual',
    order: 7,
    placeholder: 'List anticipated objections and prepared responses.\n\n- "We already have an agency"\n- "We don\'t have the budget"\n- "Now isn\'t a good time"\n- Custom objections specific to this prospect...',
  },
  {
    id: 'readiness_score',
    title: '8. Readiness Score',
    type: 'calculated',
    order: 8,
  },
]

// Extended types for data used by the research page
export interface CompanyWithRelations extends CompanyRow {
  markets?: MarketRow
  verticals?: VerticalRow
}

export interface CompetitorWithSnapshot extends CompanyWithRelations {
  latest_snapshot?: DigitalSnapshotRow | null
}

export interface ContactWithCompany extends ContactRow {
  companies?: { name: string }
}
