'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'
import { useAuth } from '@/lib/context/AuthContext'
import { showErrorToast, toastPromise } from '@/lib/utils/toast'
import { ConfirmDialog } from '@/components/ui'

import { ResearchTopBar } from '@/components/research/ResearchTopBar'
import { ResearchSidebar } from '@/components/research/ResearchSidebar'
import { CompanyOverviewSection } from '@/components/research/sections/CompanyOverviewSection'
import { CompetitiveLandscapeSection } from '@/components/research/sections/CompetitiveLandscapeSection'
import { DecisionMakingUnitSection } from '@/components/research/sections/DecisionMakingUnitSection'
import { ReadinessScoreSection } from '@/components/research/sections/ReadinessScoreSection'
import { ManualSection } from '@/components/research/sections/ManualSection'

import type { ResearchContent, CompanyWithRelations, ContactWithCompany } from '@/lib/research/types'
import { SECTION_DEFINITIONS } from '@/lib/research/types'
import type { DigitalSnapshotRow, DocumentStatus } from '@/lib/types/database'
import { generateCompanyOverview, generateCompetitiveLandscape, generateDMUContacts } from '@/lib/research/auto-populate'
import { calculateReadinessScore } from '@/lib/research/scoring'
import { downloadMarkdown, exportPDF } from '@/lib/research/export'

const DEBOUNCE_MS = 3000

function makeEmptyContent(): ResearchContent {
  return { sections: {}, readiness_checks: {}, readiness_score: 0 }
}

export default function ResearchPage() {
  const params = useParams()
  const companyId = params.id as string
  const supabase = createClient()
  const { currentOrgId } = useOrg()
  const { user } = useAuth()

  // Core data
  const [company, setCompany] = useState<CompanyWithRelations | null>(null)
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [latestSnapshot, setLatestSnapshot] = useState<DigitalSnapshotRow | null>(null)
  const [competitors, setCompetitors] = useState<CompanyWithRelations[]>([])
  const [competitorSnapshots, setCompetitorSnapshots] = useState<Map<string, DigitalSnapshotRow>>(new Map())

  // Document state
  const [docId, setDocId] = useState<string | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [docStatus, setDocStatus] = useState<DocumentStatus>('draft')
  const [docVersion, setDocVersion] = useState(1)
  const [content, setContent] = useState<ResearchContent>(makeEmptyContent())

  // UI state
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false)

  // Debounce ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(content)
  contentRef.current = content

  // ───────────────── Data Fetching ─────────────────

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    try {
      setLoading(true)

      // 1. Fetch company
      const { data: companyData, error: companyErr } = await supabase
        .from('companies')
        .select('*, markets (name, state), verticals (name)')
        .eq('id', companyId)
        .is('deleted_at', null)
        .single()
      if (companyErr) throw companyErr
      setCompany(companyData as CompanyWithRelations)

      // 2. Parallel fetches
      const [contactsRes, snapshotsRes, existingDocRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('*, companies (name)')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('is_primary', { ascending: false }),
        supabase
          .from('digital_snapshots')
          .select('*')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('snapshot_date', { ascending: false })
          .limit(1),
        supabase
          .from('generated_documents')
          .select('*')
          .eq('company_id', companyId)
          .eq('organization_id', currentOrgId)
          .eq('document_type', 'prospect_research')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      const fetchedContacts = (contactsRes.data as ContactWithCompany[]) || []
      setContacts(fetchedContacts)
      const snap = snapshotsRes.data?.[0] || null
      setLatestSnapshot(snap)

      // 3. Competitors + their snapshots
      let fetchedCompetitors: CompanyWithRelations[] = []
      const snapMap = new Map<string, DigitalSnapshotRow>()
      if (companyData.market_id && companyData.vertical_id) {
        const { data: compData } = await supabase
          .from('companies')
          .select('*, markets (name), verticals (name)')
          .eq('market_id', companyData.market_id)
          .eq('vertical_id', companyData.vertical_id)
          .neq('id', companyId)
          .is('deleted_at', null)
          .order('estimated_revenue', { ascending: false })

        fetchedCompetitors = (compData as CompanyWithRelations[]) || []
        setCompetitors(fetchedCompetitors)

        // Get latest snapshot for each competitor
        if (fetchedCompetitors.length > 0) {
          const competitorIds = fetchedCompetitors.map((c) => c.id)
          const { data: compSnapshots } = await supabase
            .from('digital_snapshots')
            .select('*')
            .in('company_id', competitorIds)
            .is('deleted_at', null)
            .order('snapshot_date', { ascending: false })

          if (compSnapshots) {
            for (const s of compSnapshots) {
              if (!snapMap.has(s.company_id)) {
                snapMap.set(s.company_id, s)
              }
            }
          }
        }
      }
      setCompetitorSnapshots(snapMap)

      // 4. Load or create document
      const existingDoc = existingDocRes.data?.[0]
      if (existingDoc) {
        setDocId(existingDoc.id)
        setDocTitle(existingDoc.title)
        setDocStatus(existingDoc.status)
        setDocVersion(existingDoc.version)
        setLastSavedAt(existingDoc.updated_at)
        const loaded = existingDoc.content as unknown as ResearchContent
        setContent(loaded && loaded.sections ? loaded : makeEmptyContent())
      } else {
        // Create new document with auto-populated sections
        const initialContent = buildAutoContent(companyData as CompanyWithRelations, fetchedContacts, fetchedCompetitors, snapMap)
        const title = `${companyData.name} - Prospect Intelligence`

        const { data: newDoc, error: createErr } = await supabase
          .from('generated_documents')
          .insert({
            organization_id: currentOrgId,
            company_id: companyId,
            title,
            document_type: 'prospect_research' as const,
            status: 'draft' as const,
            content: initialContent as unknown as Record<string, unknown>,
            readiness_score: 0,
            version: 1,
          })
          .select()
          .single()

        if (createErr) throw createErr
        setDocId(newDoc.id)
        setDocTitle(title)
        setDocStatus('draft')
        setDocVersion(1)
        setContent(initialContent)
        setLastSavedAt(newDoc.created_at)
      }
    } catch (err) {
      console.error('Error loading research data:', err)
      showErrorToast(err)
    } finally {
      setLoading(false)
    }
  }, [companyId, currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ───────────────── Auto-populate helpers ─────────────────

  function buildAutoContent(
    comp: CompanyWithRelations,
    cts: ContactWithCompany[],
    comps: CompanyWithRelations[],
    snapMap: Map<string, DigitalSnapshotRow>
  ): ResearchContent {
    const now = new Date().toISOString()
    return {
      sections: {
        company_overview: { content: generateCompanyOverview(comp), source: 'auto_generated', updated_at: now },
        competitive_landscape: { content: generateCompetitiveLandscape(comps, snapMap), source: 'auto_generated', updated_at: now },
        decision_making_unit: { content: generateDMUContacts(cts), source: 'auto_generated', updated_at: now },
      },
      readiness_checks: {},
      readiness_score: 0,
    }
  }

  // ───────────────── Auto-save ─────────────────

  const saveDocument = useCallback(async () => {
    if (!docId || !currentOrgId) return
    try {
      setSaveStatus('saving')
      const { error } = await supabase
        .from('generated_documents')
        .update({
          title: docTitle,
          content: contentRef.current as unknown as Record<string, unknown>,
          readiness_score: contentRef.current.readiness_score,
          status: docStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId)

      if (error) throw error
      const now = new Date().toISOString()
      setLastSavedAt(now)
      setSaveStatus('saved')
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('error')
    }
  }, [docId, currentOrgId, docTitle, docStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveDocument()
    }, DEBOUNCE_MS)
  }, [saveDocument])

  // ───────────────── Section updates ─────────────────

  const updateSection = useCallback((sectionId: string, newContent: string) => {
    setContent((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          content: newContent,
          source: 'human_edited' as const,
          updated_at: new Date().toISOString(),
        },
      },
    }))
    scheduleSave()
  }, [scheduleSave])

  const refreshAutoSection = useCallback((sectionId: string) => {
    if (!company) return
    const now = new Date().toISOString()
    let newContent = ''
    if (sectionId === 'company_overview') {
      newContent = generateCompanyOverview(company)
    } else if (sectionId === 'competitive_landscape') {
      newContent = generateCompetitiveLandscape(competitors, competitorSnapshots)
    } else if (sectionId === 'decision_making_unit') {
      newContent = generateDMUContacts(contacts)
    }
    setContent((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: { content: newContent, source: 'auto_generated', updated_at: now },
      },
    }))
    scheduleSave()
  }, [company, competitors, competitorSnapshots, contacts, scheduleSave])

  const toggleReadinessCheck = useCallback((criterionId: string) => {
    setContent((prev) => {
      const newChecks = { ...prev.readiness_checks, [criterionId]: !prev.readiness_checks[criterionId] }
      const newScore = calculateReadinessScore(newChecks)
      return { ...prev, readiness_checks: newChecks, readiness_score: newScore }
    })
    scheduleSave()
  }, [scheduleSave])

  // ───────────────── Status & Approval ─────────────────

  const handleStatusChange = useCallback(async (newStatus: DocumentStatus) => {
    setDocStatus(newStatus)
    if (!docId) return
    try {
      await supabase
        .from('generated_documents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', docId)
      setSaveStatus('saved')
      setLastSavedAt(new Date().toISOString())
    } catch (err) {
      showErrorToast(err)
    }
  }, [docId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = useCallback(async () => {
    setConfirmApproveOpen(false)
    if (!docId || !user) return

    const approvePromise = (async () => {
      const now = new Date().toISOString()
      // Update document
      const { error: docErr } = await supabase
        .from('generated_documents')
        .update({
          status: 'approved' as const,
          approved_by: user.id,
          approved_at: now,
          content: contentRef.current as unknown as Record<string, unknown>,
          readiness_score: contentRef.current.readiness_score,
          updated_at: now,
        })
        .eq('id', docId)
      if (docErr) throw docErr

      // Update company readiness + last_researched_at
      const { error: compErr } = await supabase
        .from('companies')
        .update({
          readiness_score: contentRef.current.readiness_score,
          last_researched_at: now,
        })
        .eq('id', companyId)
      if (compErr) throw compErr

      setDocStatus('approved')
      setLastSavedAt(now)
      setSaveStatus('saved')
    })()

    await toastPromise(approvePromise, {
      loading: 'Approving research document...',
      success: 'Research document approved',
      error: 'Failed to approve document',
    })
  }, [docId, user, companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = useCallback((newTitle: string) => {
    setDocTitle(newTitle)
    scheduleSave()
  }, [scheduleSave])

  // ───────────────── Render ─────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              <div className="h-48 bg-slate-200 rounded" />
              <div className="h-48 bg-slate-200 rounded" />
              <div className="h-48 bg-slate-200 rounded" />
            </div>
            <div className="space-y-6">
              <div className="h-40 bg-slate-200 rounded" />
              <div className="h-32 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Company Not Found</h1>
          <a href={`/companies/${companyId}`} className="text-cyan-600 hover:text-cyan-700">
            Back to company
          </a>
        </div>
      </div>
    )
  }

  // Section definitions for manual sections
  const manualSections = SECTION_DEFINITIONS.filter((s) => s.type === 'manual')

  return (
    <div className="min-h-screen bg-slate-50">
      <ResearchTopBar
        companyId={companyId}
        title={docTitle}
        onTitleChange={handleTitleChange}
        status={docStatus}
        onStatusChange={handleStatusChange}
        readinessScore={content.readiness_score}
        version={docVersion}
        lastSavedAt={lastSavedAt}
        saveStatus={saveStatus}
        onExportMd={() => downloadMarkdown(docTitle, content)}
        onExportPdf={exportPDF}
        onApprove={() => setConfirmApproveOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main content - 2/3 */}
          <div className="col-span-2 space-y-6">
            {/* 1. Company Overview (auto) */}
            <CompanyOverviewSection
              content={content.sections.company_overview}
              onRefresh={() => refreshAutoSection('company_overview')}
            />

            {/* 2. Market Context (manual) */}
            <ManualSection
              definition={SECTION_DEFINITIONS[1]}
              content={content.sections.market_context}
              onChange={(val) => updateSection('market_context', val)}
            />

            {/* 3. Value Proposition (manual) */}
            <ManualSection
              definition={SECTION_DEFINITIONS[2]}
              content={content.sections.value_proposition}
              onChange={(val) => updateSection('value_proposition', val)}
            />

            {/* 4. Competitive Landscape (auto) */}
            <CompetitiveLandscapeSection
              content={content.sections.competitive_landscape}
              onRefresh={() => refreshAutoSection('competitive_landscape')}
            />

            {/* 5. DMU (hybrid) */}
            <DecisionMakingUnitSection
              contactsContent={content.sections.decision_making_unit}
              roleNotes={content.sections.dmu_role_notes?.content || ''}
              onRefreshContacts={() => refreshAutoSection('decision_making_unit')}
              onRoleNotesChange={(val) => updateSection('dmu_role_notes', val)}
            />

            {/* 6. Engagement Strategy (manual) */}
            <ManualSection
              definition={SECTION_DEFINITIONS[5]}
              content={content.sections.engagement_strategy}
              onChange={(val) => updateSection('engagement_strategy', val)}
            />

            {/* 7. Objection Handling (manual) */}
            <ManualSection
              definition={SECTION_DEFINITIONS[6]}
              content={content.sections.objection_handling}
              onChange={(val) => updateSection('objection_handling', val)}
            />

            {/* 8. Readiness Score (calculated) */}
            <ReadinessScoreSection
              checks={content.readiness_checks}
              score={content.readiness_score}
              onToggle={toggleReadinessCheck}
            />
          </div>

          {/* Sidebar - 1/3 */}
          <div>
            <ResearchSidebar
              company={company}
              contacts={contacts}
              latestSnapshot={latestSnapshot}
              competitorCount={competitors.length}
            />
          </div>
        </div>
      </div>

      {/* Approve confirm dialog */}
      <ConfirmDialog
        open={confirmApproveOpen}
        onClose={() => setConfirmApproveOpen(false)}
        onConfirm={handleApprove}
        title="Approve Research Document?"
        message="This will mark the document as approved and update the company's readiness score and last researched date."
      />
    </div>
  )
}
