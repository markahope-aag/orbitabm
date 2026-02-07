'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SectionBlock } from '../SectionBlock'
import type { SectionContent } from '@/lib/research/types'

interface CompanyOverviewSectionProps {
  content: SectionContent | undefined
  onRefresh: () => void
}

export function CompanyOverviewSection({ content, onRefresh }: CompanyOverviewSectionProps) {
  return (
    <SectionBlock
      title="1. Company Overview"
      type="auto"
      source={content?.source}
      hasContent={!!content?.content}
      onRefresh={onRefresh}
    >
      <div className="prose prose-sm prose-slate max-w-none">
        {content?.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.content}</ReactMarkdown>
        ) : (
          <p className="text-slate-400 italic">Loading company data...</p>
        )}
      </div>
    </SectionBlock>
  )
}
