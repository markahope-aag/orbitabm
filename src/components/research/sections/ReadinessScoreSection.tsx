'use client'

import { SectionBlock } from '../SectionBlock'
import { READINESS_CRITERIA, getScoreBgColor } from '@/lib/research/scoring'

interface ReadinessScoreSectionProps {
  checks: Record<string, boolean>
  score: number
  onToggle: (criterionId: string) => void
}

export function ReadinessScoreSection({ checks, score, onToggle }: ReadinessScoreSectionProps) {
  return (
    <SectionBlock
      title="8. Readiness Score"
      type="calculated"
      hasContent
    >
      <div className="space-y-4">
        {/* Score display */}
        <div className="flex items-center space-x-3">
          <span className={`text-2xl font-bold px-3 py-1 rounded-md ${getScoreBgColor(score)}`}>
            {score} / 10
          </span>
          <span className="text-sm text-slate-500">
            {score >= 7 ? 'Ready for campaign' : score >= 4 ? 'Needs more preparation' : 'Not ready'}
          </span>
        </div>

        {/* Criteria checkboxes */}
        <div className="space-y-3">
          {READINESS_CRITERIA.map((criterion) => (
            <label
              key={criterion.id}
              className="flex items-start space-x-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={checks[criterion.id] || false}
                onChange={() => onToggle(criterion.id)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  {criterion.label}
                </span>
                <span className="ml-2 text-xs text-slate-400">
                  ({criterion.points} pts)
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </SectionBlock>
  )
}
