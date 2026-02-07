import type {
  CampaignRow,
  CompanyRow,
  ContactRow,
  MarketRow,
  VerticalRow,
  PlaybookTemplateRow,
  ActivityRow,
  PlaybookStepRow,
  ProfileRow,
} from '@/lib/types/database'

// Extended campaign with joins
export interface CampaignWithRelations extends CampaignRow {
  companies?: CompanyRow & {
    markets?: MarketRow
    verticals?: VerticalRow
  }
  playbook_templates?: PlaybookTemplateRow
  profiles?: ProfileRow
}

// Activity with playbook step details
export interface ActivityWithStep extends ActivityRow {
  playbook_steps?: PlaybookStepRow
  contacts?: ContactRow
}

// Contact for dropdowns
export interface ContactOption extends ContactRow {
  companies?: { name: string }
}

// Email draft state keyed by activity ID
export interface EmailDraft {
  activityId: string
  playbookStepId: string | null
  emailTemplateId: string | null
  subjectLine: string
  subjectLineAlt: string
  body: string
  targetContactId: string | null
  notes: string
}

// Operational notes stored in generated_documents content
export interface SequenceNotes {
  if_respond: string
  if_no_response: string
}

// Pre-launch checklist item
export interface ChecklistItem {
  id: string
  label: string
  passed: boolean
}
