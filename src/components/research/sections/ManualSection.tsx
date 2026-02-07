'use client'

import { SectionBlock } from '../SectionBlock'
import { MarkdownEditor } from '../MarkdownEditor'
import type { SectionContent, SectionDefinition } from '@/lib/research/types'

interface ManualSectionProps {
  definition: SectionDefinition
  content: SectionContent | undefined
  onChange: (content: string) => void
}

export function ManualSection({ definition, content, onChange }: ManualSectionProps) {
  return (
    <SectionBlock
      title={definition.title}
      type="manual"
      source={content?.source}
      hasContent={!!content?.content}
    >
      <MarkdownEditor
        value={content?.content || ''}
        onChange={onChange}
        placeholder={definition.placeholder}
      />
    </SectionBlock>
  )
}
