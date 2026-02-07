'use client'

import { ExternalLink, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { CompanyWithRelations, ContactWithCompany } from '@/lib/research/types'
import type { DigitalSnapshotRow } from '@/lib/types/database'

interface ResearchSidebarProps {
  company: CompanyWithRelations
  contacts: ContactWithCompany[]
  latestSnapshot: DigitalSnapshotRow | null
  competitorCount: number
}

function formatCurrency(value: number | null): string {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number | null): string {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('en-US').format(value)
}

export function ResearchSidebar({ company, contacts, latestSnapshot, competitorCount }: ResearchSidebarProps) {
  // Calculate data gaps
  const gaps: string[] = []
  if (contacts.length === 0) gaps.push('No contacts on file')
  if (!latestSnapshot) gaps.push('No digital snapshot captured')
  if (competitorCount === 0) gaps.push('No competitors identified')
  if (!company.estimated_revenue) gaps.push('Revenue not set')
  if (!company.employee_count) gaps.push('Employee count not set')

  return (
    <div className="space-y-6 sticky top-6">
      {/* Company Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Company</h3>
        <div className="space-y-2">
          <div className="font-semibold text-slate-900 text-lg">{company.name}</div>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-cyan-600 hover:text-cyan-700"
            >
              {company.website.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          )}
          <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
            <div>
              <span className="text-slate-500">Revenue</span>
              <div className="font-medium text-slate-900">{formatCurrency(company.estimated_revenue)}</div>
            </div>
            <div>
              <span className="text-slate-500">Employees</span>
              <div className="font-medium text-slate-900">{formatNumber(company.employee_count)}</div>
            </div>
            <div>
              <span className="text-slate-500">Market</span>
              <div className="font-medium text-slate-900">{company.markets?.name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-500">Vertical</span>
              <div className="font-medium text-slate-900">{company.verticals?.name || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Contacts ({contacts.length})
        </h3>
        {contacts.length > 0 ? (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-900">
                    {contact.first_name} {contact.last_name}
                  </span>
                  {contact.email_verified ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                {contact.title && (
                  <div className="text-xs text-slate-500">{contact.title}</div>
                )}
                {contact.dmu_role && (
                  <Badge
                    label={contact.dmu_role.replace(/_/g, ' ')}
                    color={contact.dmu_role === 'economic_buyer' ? 'green' : contact.dmu_role === 'champion' ? 'blue' : 'gray'}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No contacts on file.</p>
        )}
      </div>

      {/* Latest Snapshot */}
      {latestSnapshot && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Latest Snapshot
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {latestSnapshot.google_rating != null && (
              <div>
                <span className="text-slate-500">Google</span>
                <div className="font-medium text-slate-900">
                  {latestSnapshot.google_rating}/5
                  {latestSnapshot.google_review_count != null && (
                    <span className="text-xs text-slate-400 ml-1">
                      ({formatNumber(latestSnapshot.google_review_count)})
                    </span>
                  )}
                </div>
              </div>
            )}
            {latestSnapshot.domain_authority != null && (
              <div>
                <span className="text-slate-500">DA</span>
                <div className="font-medium text-slate-900">{latestSnapshot.domain_authority}</div>
              </div>
            )}
            {(latestSnapshot.page_speed_mobile != null || latestSnapshot.page_speed_desktop != null) && (
              <div>
                <span className="text-slate-500">Page Speed</span>
                <div className="font-medium text-slate-900">
                  {latestSnapshot.page_speed_mobile || latestSnapshot.page_speed_desktop}/100
                </div>
              </div>
            )}
            {(latestSnapshot.facebook_followers != null || latestSnapshot.instagram_followers != null || latestSnapshot.linkedin_followers != null) && (
              <div>
                <span className="text-slate-500">Social</span>
                <div className="font-medium text-slate-900">
                  {formatNumber(
                    (latestSnapshot.facebook_followers || 0) +
                    (latestSnapshot.instagram_followers || 0) +
                    (latestSnapshot.linkedin_followers || 0)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Gaps */}
      {gaps.length > 0 && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Data Gaps</h3>
          </div>
          <ul className="space-y-1">
            {gaps.map((gap) => (
              <li key={gap} className="text-sm text-amber-700">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
