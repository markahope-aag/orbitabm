import type { ResearchContent } from './types'
import { SECTION_DEFINITIONS } from './types'
import { READINESS_CRITERIA } from './scoring'

export function exportToMarkdown(title: string, content: ResearchContent): string {
  const lines: string[] = [`# ${title}`, '']

  for (const section of SECTION_DEFINITIONS) {
    lines.push(`## ${section.title}`)
    lines.push('')

    if (section.id === 'readiness_score') {
      lines.push(`**Score: ${content.readiness_score} / 10**`)
      lines.push('')
      for (const criterion of READINESS_CRITERIA) {
        const checked = content.readiness_checks?.[criterion.id] ? 'x' : ' '
        lines.push(`- [${checked}] ${criterion.label} (${criterion.points} pts)`)
      }
    } else {
      const sectionContent = content.sections?.[section.id]?.content
      lines.push(sectionContent || '_No content._')
    }

    lines.push('')
  }

  lines.push('---')
  lines.push(`_Generated ${new Date().toLocaleDateString()}_`)

  return lines.join('\n')
}

export function downloadMarkdown(title: string, content: ResearchContent): void {
  const markdown = exportToMarkdown(title, content)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportPDF(): void {
  window.print()
}
