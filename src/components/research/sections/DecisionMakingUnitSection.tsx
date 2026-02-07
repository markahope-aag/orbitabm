'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SectionBlock } from '../SectionBlock'
import { MarkdownEditor } from '../MarkdownEditor'
import type { SectionContent } from '@/lib/research/types'

interface DecisionMakingUnitSectionProps {
  contactsContent: SectionContent | undefined
  roleNotes: string
  onRefreshContacts: () => void
  onRoleNotesChange: (notes: string) => void
}

export function DecisionMakingUnitSection({
  contactsContent,
  roleNotes,
  onRefreshContacts,
  onRoleNotesChange,
}: DecisionMakingUnitSectionProps) {
  return (
    <SectionBlock
      title="5. Decision-Making Unit (DMU)"
      type="hybrid"
      source={contactsContent?.source}
      hasContent={!!contactsContent?.content}
      onRefresh={onRefreshContacts}
    >
      <div className="space-y-6">
        {/* Auto-populated contacts table */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Contacts</h3>
          <div className="prose prose-sm prose-slate max-w-none">
            {contactsContent?.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{contactsContent.content}</ReactMarkdown>
            ) : (
              <p className="text-slate-400 italic">No contacts on file.</p>
            )}
          </div>
        </div>

        {/* Editable role notes */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Role Notes & Strategy</h3>
          <MarkdownEditor
            value={roleNotes}
            onChange={onRoleNotesChange}
            placeholder="Add notes about each DMU role, their priorities, and how to approach them.&#10;&#10;- **Economic Buyer**: Budget authority, focused on ROI...&#10;- **Technical Buyer**: Evaluates capabilities...&#10;- **Champion**: Internal advocate who..."
          />
        </div>
      </div>
    </SectionBlock>
  )
}
