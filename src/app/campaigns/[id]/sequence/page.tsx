'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'
import { showErrorToast, showSuccessToast, toastPromise } from '@/lib/utils/toast'
import { ArrowLeft, Download, Rocket } from 'lucide-react'
import { StatusBadge } from '@/components/ui'

import { CampaignBrief } from '@/components/sequence/CampaignBrief'
import { EmailTimelineCard } from '@/components/sequence/EmailTimelineCard'
import { MergeFieldsPanel } from '@/components/sequence/MergeFieldsPanel'
import { EmailPreviewModal } from '@/components/sequence/EmailPreviewModal'
import { PreLaunchChecklist } from '@/components/sequence/PreLaunchChecklist'
import { OperationalNotes } from '@/components/sequence/OperationalNotes'
import { LaunchModal } from '@/components/sequence/LaunchModal'

import type {
  CampaignWithRelations,
  ActivityWithStep,
  ContactOption,
  EmailDraft,
  ChecklistItem,
} from '@/lib/sequence/types'
import type { ContactRow, GeneratedDocumentRow, AssetRow } from '@/lib/types/database'
import { downloadSequenceMarkdown } from '@/lib/sequence/export'

const DEFAULT_IF_RESPOND =
  'Pivot to discovery call. Lead with questions:\n- [Question about their current process]\n- [Question about timing/priorities]\n- Offer to send physical samples or mockups'
const DEFAULT_IF_NO_RESPONSE =
  'Wait 60 days, then re-engage with new trigger.\nTry alternate entry point.\nConsider physical mailer.'

export default function SequencePage() {
  const params = useParams()
  const campaignId = params.id as string
  const supabase = createClient()
  const { currentOrgId } = useOrg()

  // Core data
  const [campaign, setCampaign] = useState<CampaignWithRelations | null>(null)
  const [activities, setActivities] = useState<ActivityWithStep[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [drafts, setDrafts] = useState<Map<string, EmailDraft>>(new Map())
  const [assets, setAssets] = useState<AssetRow[]>([])

  // Document for operational notes
  const [seqDocId, setSeqDocId] = useState<string | null>(null)
  const [ifRespond, setIfRespond] = useState(DEFAULT_IF_RESPOND)
  const [ifNoResponse, setIfNoResponse] = useState(DEFAULT_IF_NO_RESPONSE)

  // Research doc check
  const [hasApprovedResearch, setHasApprovedResearch] = useState(false)

  // Primary/secondary contact tracking (from brief)
  const [primaryContactId, setPrimaryContactId] = useState<string | null>(null)
  const [secondaryContactId, setSecondaryContactId] = useState<string | null>(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDraft, setPreviewDraft] = useState<EmailDraft | null>(null)
  const [launchModalOpen, setLaunchModalOpen] = useState(false)

  // ───────────────── Data Fetching ─────────────────

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    try {
      setLoading(true)

      // 1. Campaign with relations
      const { data: campaignData, error: campaignErr } = await supabase
        .from('campaigns')
        .select(`
          *,
          companies (*, markets (name, state), verticals (name)),
          playbook_templates (name),
          profiles (full_name)
        `)
        .eq('id', campaignId)
        .is('deleted_at', null)
        .single()
      if (campaignErr) throw campaignErr
      setCampaign(campaignData as CampaignWithRelations)

      // 2. Parallel fetches
      const companyId = campaignData.company_id
      const [activitiesRes, contactsRes, assetsRes, researchRes, seqDocRes] = await Promise.all([
        // Activities for this campaign (email + linkedin only)
        supabase
          .from('activities')
          .select('*, playbook_steps (*), contacts (*)')
          .eq('campaign_id', campaignId)
          .in('channel', ['email', 'linkedin'])
          .order('scheduled_date'),
        // Contacts for the target company
        supabase
          .from('contacts')
          .select('*, companies (name)')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('is_primary', { ascending: false }),
        // Assets linked to the campaign
        supabase
          .from('assets')
          .select('*')
          .eq('campaign_id', campaignId)
          .is('deleted_at', null),
        // Check for approved research doc
        supabase
          .from('generated_documents')
          .select('id')
          .eq('company_id', companyId)
          .eq('organization_id', currentOrgId)
          .eq('document_type', 'prospect_research')
          .eq('status', 'approved')
          .is('deleted_at', null)
          .limit(1),
        // Existing sequence notes doc
        supabase
          .from('generated_documents')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('organization_id', currentOrgId)
          .eq('document_type', 'campaign_sequence')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      const fetchedActivities = (activitiesRes.data as ActivityWithStep[]) || []
      setActivities(fetchedActivities)
      const fetchedContacts = (contactsRes.data as ContactOption[]) || []
      setContacts(fetchedContacts)
      setAssets(assetsRes.data || [])
      setHasApprovedResearch((researchRes.data?.length || 0) > 0)

      // Set primary contact from contacts
      const primary = fetchedContacts.find((c) => c.is_primary)
      setPrimaryContactId(primary?.id || fetchedContacts[0]?.id || null)

      // 3. Load email templates for each activity's playbook_step_id
      //    Prefer campaign-scoped templates; fall back to org-level defaults.
      const stepIds = fetchedActivities
        .map((a) => a.playbook_step_id)
        .filter((id): id is string => !!id)
      const uniqueStepIds = [...new Set(stepIds)]

      type TemplateEntry = { subject_line: string; subject_line_alt: string | null; body: string; target_contact_role: string | null; notes: string | null; id: string; campaign_id: string | null }
      const emailTemplateMap = new Map<string, TemplateEntry>()

      if (uniqueStepIds.length > 0) {
        // Fetch campaign-scoped templates first
        const { data: campaignTemplates } = await supabase
          .from('email_templates')
          .select('*')
          .eq('organization_id', currentOrgId)
          .eq('campaign_id', campaignId)
          .in('playbook_step_id', uniqueStepIds)

        const coveredStepIds = new Set(
          (campaignTemplates || []).map((t: TemplateEntry) => (t as Record<string, unknown>).playbook_step_id as string)
        )
        const uncoveredStepIds = uniqueStepIds.filter((id) => !coveredStepIds.has(id))

        // For uncovered steps, fetch org-level defaults (campaign_id IS NULL)
        let orgTemplates: TemplateEntry[] = []
        if (uncoveredStepIds.length > 0) {
          const { data } = await supabase
            .from('email_templates')
            .select('*')
            .eq('organization_id', currentOrgId)
            .is('campaign_id', null)
            .in('playbook_step_id', uncoveredStepIds)
          orgTemplates = (data as TemplateEntry[]) || []
        }

        // Org defaults first (will be overwritten by campaign-specific)
        for (const t of orgTemplates) {
          emailTemplateMap.set((t as unknown as Record<string, string>).playbook_step_id, t)
        }
        // Campaign-specific templates take priority
        for (const t of (campaignTemplates as TemplateEntry[] || [])) {
          emailTemplateMap.set((t as unknown as Record<string, string>).playbook_step_id, t)
        }
      }

      // Build drafts from activities + templates
      // Only set emailTemplateId for campaign-scoped templates (safe to update in-place).
      // Org-level defaults are treated as read-only seeds — first edit creates a campaign copy.
      const newDrafts = new Map<string, EmailDraft>()
      for (const act of fetchedActivities) {
        const tmpl = act.playbook_step_id ? emailTemplateMap.get(act.playbook_step_id) : undefined
        const isCampaignScoped = tmpl?.campaign_id === campaignId
        newDrafts.set(act.id, {
          activityId: act.id,
          playbookStepId: act.playbook_step_id,
          emailTemplateId: isCampaignScoped ? (tmpl?.id || null) : null,
          subjectLine: tmpl?.subject_line || '',
          subjectLineAlt: tmpl?.subject_line_alt || '',
          body: tmpl?.body || '',
          targetContactId: act.contact_id || primary?.id || null,
          notes: tmpl?.notes || '',
        })
      }
      setDrafts(newDrafts)

      // 4. Load sequence notes doc
      const seqDoc = seqDocRes.data?.[0] as GeneratedDocumentRow | undefined
      if (seqDoc) {
        setSeqDocId(seqDoc.id)
        const content = seqDoc.content as Record<string, string> | null
        if (content) {
          setIfRespond(content.if_respond || DEFAULT_IF_RESPOND)
          setIfNoResponse(content.if_no_response || DEFAULT_IF_NO_RESPONSE)
        }
      }
    } catch (err) {
      console.error('Error loading sequence data:', err)
      showErrorToast(err)
    } finally {
      setLoading(false)
    }
  }, [campaignId, currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ───────────────── Saving ─────────────────

  const saveCampaignField = useCallback(async (field: string, value: string | null) => {
    if (!campaign) return
    // Handle contact selections that don't go on the campaigns table
    if (field === 'primary_contact_id') {
      setPrimaryContactId(value)
      return
    }
    if (field === 'secondary_contact_id') {
      setSecondaryContactId(value)
      return
    }
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ [field]: value })
        .eq('id', campaignId)
      if (error) throw error
      setCampaign((prev) => prev ? { ...prev, [field]: value } : prev)
    } catch (err) {
      showErrorToast(err)
    }
  }, [campaign, campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveEmailDraft = useCallback(async (draft: EmailDraft) => {
    if (!currentOrgId || !campaign) return
    try {
      if (draft.emailTemplateId) {
        // Update existing campaign-scoped template
        await supabase
          .from('email_templates')
          .update({
            subject_line: draft.subjectLine,
            subject_line_alt: draft.subjectLineAlt || null,
            body: draft.body,
            notes: draft.notes || null,
          })
          .eq('id', draft.emailTemplateId)
      } else if (draft.playbookStepId) {
        // Create campaign-scoped template (copy-on-write from org default)
        const { data, error } = await supabase
          .from('email_templates')
          .insert({
            organization_id: currentOrgId,
            campaign_id: campaignId,
            playbook_step_id: draft.playbookStepId,
            name: draft.subjectLine || 'Untitled',
            subject_line: draft.subjectLine,
            subject_line_alt: draft.subjectLineAlt || null,
            body: draft.body,
            notes: draft.notes || null,
          })
          .select()
          .single()

        if (!error && data) {
          // Update draft with new template ID
          setDrafts((prev) => {
            const next = new Map(prev)
            const existing = next.get(draft.activityId)
            if (existing) {
              next.set(draft.activityId, { ...existing, emailTemplateId: data.id })
            }
            return next
          })
        }
      }

      // Update activity contact
      if (draft.targetContactId) {
        await supabase
          .from('activities')
          .update({ contact_id: draft.targetContactId })
          .eq('id', draft.activityId)
      }
    } catch (err) {
      showErrorToast(err)
    }
  }, [currentOrgId, campaign, campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveOperationalNotes = useCallback(async () => {
    if (!currentOrgId || !campaign) return
    try {
      const content = { if_respond: ifRespond, if_no_response: ifNoResponse }
      if (seqDocId) {
        await supabase
          .from('generated_documents')
          .update({ content: content as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq('id', seqDocId)
      } else {
        const { data, error } = await supabase
          .from('generated_documents')
          .insert({
            organization_id: currentOrgId,
            campaign_id: campaignId,
            company_id: campaign.company_id,
            title: `${campaign.name} - Sequence Notes`,
            document_type: 'campaign_sequence' as const,
            status: 'draft' as const,
            content: content as unknown as Record<string, unknown>,
            version: 1,
          })
          .select()
          .single()
        if (!error && data) setSeqDocId(data.id)
      }
    } catch (err) {
      showErrorToast(err)
    }
  }, [currentOrgId, campaign, campaignId, seqDocId, ifRespond, ifNoResponse]) // eslint-disable-line react-hooks/exhaustive-deps

  // ───────────────── Draft state helpers ─────────────────

  const updateDraft = useCallback((activityId: string, draft: EmailDraft) => {
    setDrafts((prev) => {
      const next = new Map(prev)
      next.set(activityId, draft)
      return next
    })
  }, [])

  // ───────────────── Checklist ─────────────────

  const draftsArr = Array.from(drafts.values())
  const primaryContact = contacts.find((c) => c.id === primaryContactId)

  const checklistItems: ChecklistItem[] = [
    {
      id: 'research_approved',
      label: 'Research document approved',
      passed: hasApprovedResearch,
    },
    {
      id: 'primary_email_verified',
      label: 'Primary contact email verified',
      passed: !!primaryContact?.email_verified,
    },
    {
      id: 'all_subjects',
      label: 'All emails have subject lines',
      passed: draftsArr.length > 0 && draftsArr.every((d) => !!d.subjectLine),
    },
    {
      id: 'all_bodies',
      label: 'All emails have body content',
      passed: draftsArr.length > 0 && draftsArr.every((d) => !!d.body),
    },
    {
      id: 'assets_ready',
      label: 'Campaign assets ready',
      passed: assets.length === 0 || assets.every((a) => a.status === 'ready' || a.status === 'delivered'),
    },
  ]

  // ───────────────── Launch ─────────────────

  const handleLaunch = useCallback(async () => {
    setLaunchModalOpen(false)
    if (!campaign) return

    const launchPromise = (async () => {
      // Set campaign active
      const { error: campErr } = await supabase
        .from('campaigns')
        .update({ status: 'active', start_date: campaign.start_date || new Date().toISOString().split('T')[0] })
        .eq('id', campaignId)
      if (campErr) throw campErr

      // Set all scheduled activities
      const { error: actErr } = await supabase
        .from('activities')
        .update({ status: 'scheduled' })
        .eq('campaign_id', campaignId)
        .eq('status', 'scheduled')
      if (actErr) throw actErr

      // Generate email queue via bulk API
      const bulkRes = await fetch('/api/email-sends/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      })
      const bulkData = await bulkRes.json()
      if (!bulkRes.ok) {
        console.error('Bulk email queue generation failed:', bulkData)
        // Don't throw — campaign is already active, email queue can be retried
      }

      setCampaign((prev) => prev ? { ...prev, status: 'active' } : prev)

      return bulkData
    })()

    await toastPromise(launchPromise, {
      loading: 'Launching campaign and generating email queue...',
      success: (data) => {
        if (data?.created) {
          return `Campaign launched! ${data.created} emails queued across ${data.steps} steps.`
        }
        return 'Campaign launched!'
      },
      error: 'Failed to launch campaign',
    })
  }, [campaign, campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ───────────────── Preview ─────────────────

  const openPreview = useCallback((draft: EmailDraft) => {
    setPreviewDraft(draft)
    setPreviewOpen(true)
  }, [])

  // ───────────────── Render ─────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-8" />
          <div className="h-48 bg-slate-200 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Campaign Not Found</h1>
          <Link href="/campaigns" className="text-cyan-600 hover:text-cyan-700">
            Back to campaigns
          </Link>
        </div>
      </div>
    )
  }

  const previewContact = previewDraft
    ? contacts.find((c) => c.id === previewDraft.targetContactId) || null
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center mb-3">
            <a
              href={`/campaigns/${campaignId}`}
              className="flex items-center text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Campaign
            </a>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-slate-900">
                {campaign.name} — Sequence Builder
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() =>
                  downloadSequenceMarkdown(campaign, draftsArr, contacts, {
                    if_respond: ifRespond,
                    if_no_response: ifNoResponse,
                  })
                }
                className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export Sequence
              </button>
              <button
                onClick={() => setLaunchModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700"
              >
                <Rocket className="w-3.5 h-3.5 mr-1" />
                Launch Campaign
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Brief */}
        <div className="mb-8">
          <CampaignBrief
            campaign={campaign}
            contacts={contacts}
            primaryContactId={primaryContactId}
            secondaryContactId={secondaryContactId}
            onFieldBlur={saveCampaignField}
          />
        </div>

        {/* Email Timeline + Merge Fields */}
        <div className="grid grid-cols-4 gap-8 mb-8">
          {/* Timeline — 3/4 */}
          <div className="col-span-3">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Email Sequence</h2>
            {activities.length > 0 ? (
              <div>
                {activities.map((activity) => {
                  const draft = drafts.get(activity.id)
                  if (!draft) return null
                  return (
                    <EmailTimelineCard
                      key={activity.id}
                      activity={activity}
                      draft={draft}
                      contacts={contacts}
                      onDraftChange={(d) => updateDraft(activity.id, d)}
                      onDraftBlur={() => saveEmailDraft(draft)}
                      onPreview={() => openPreview(draft)}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                No email or LinkedIn activities found for this campaign.
              </div>
            )}
          </div>

          {/* Merge Fields — 1/4 */}
          <div>
            <MergeFieldsPanel
              onInsert={(token) => {
                // Handled per-card via onInsertMergeField
                // This is a fallback that copies to clipboard
                navigator.clipboard.writeText(token)
                showSuccessToast(`Copied ${token}`)
              }}
            />
          </div>
        </div>

        {/* Operational Notes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Operational Notes</h2>
          <PreLaunchChecklist items={checklistItems} />
          <OperationalNotes
            title="If They Respond"
            value={ifRespond}
            onChange={setIfRespond}
            onBlur={saveOperationalNotes}
          />
          <OperationalNotes
            title="If No Response"
            value={ifNoResponse}
            onChange={setIfNoResponse}
            onBlur={saveOperationalNotes}
          />
        </div>
      </div>

      {/* Preview Modal */}
      <EmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        subjectLine={previewDraft?.subjectLine || ''}
        body={previewDraft?.body || ''}
        company={campaign.companies || null}
        contact={previewContact as ContactRow | null}
        campaign={campaign}
      />

      {/* Launch Modal */}
      <LaunchModal
        open={launchModalOpen}
        onClose={() => setLaunchModalOpen(false)}
        onLaunch={handleLaunch}
        items={checklistItems}
      />
    </div>
  )
}
