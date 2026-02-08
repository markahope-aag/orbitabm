'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Clock, User } from 'lucide-react'
import type {
  CampaignRow,
  CompanyRow,
  MarketRow,
  VerticalRow,
  PlaybookTemplateRow,
  ProfileRow,
  ActivityRow
} from '@/lib/types/database'

export interface CampaignWithRelations extends CampaignRow {
  companies?: CompanyRow & {
    markets?: MarketRow
    verticals?: VerticalRow
  }
  playbook_templates?: PlaybookTemplateRow
  profiles?: ProfileRow
  total_steps?: number
  next_activity?: ActivityRow
  days_since_start?: number
}

function getCardBorderColor(campaign: CampaignWithRelations) {
  if (!campaign.next_activity || !campaign.next_activity.scheduled_date) return 'border-slate-200'

  const today = new Date()
  const activityDate = new Date(campaign.next_activity.scheduled_date)

  today.setHours(0, 0, 0, 0)
  activityDate.setHours(0, 0, 0, 0)

  if (activityDate < today) return 'border-red-400'
  if (activityDate.getTime() === today.getTime()) return 'border-amber-400'
  return 'border-emerald-400'
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)
}

interface BoardCardProps {
  campaign: CampaignWithRelations
}

export default function BoardCard({ campaign }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: campaign.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = () => {
    window.location.href = `/campaigns/${campaign.id}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-white rounded-lg border-2 ${getCardBorderColor(campaign)} p-4 cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''}`}
    >
      <CardContent campaign={campaign} />
    </div>
  )
}

export function CardContent({ campaign }: { campaign: CampaignWithRelations }) {
  return (
    <>
      <h4 className="font-bold text-slate-900 mb-2 text-sm">
        {campaign.companies?.name || 'Unknown Company'}
      </h4>

      <p className="text-xs text-slate-600 mb-3">
        {[
          campaign.companies?.markets?.name,
          campaign.companies?.verticals?.name
        ].filter(Boolean).join(' — ') || 'No market/vertical'}
      </p>

      <div className="flex items-center text-xs text-slate-500 mb-2">
        <Clock className="w-3 h-3 mr-1" />
        Step {campaign.current_step || 1} of {campaign.total_steps || 0}
      </div>

      <div className="flex items-center text-xs text-slate-500 mb-2">
        <Calendar className="w-3 h-3 mr-1" />
        {campaign.days_since_start || 0} days since start
      </div>

      {campaign.next_activity && (
        <div className="flex items-center text-xs text-slate-500 mb-3">
          <span className="font-medium">Next:</span>
          <span className="ml-1">
            {campaign.next_activity.scheduled_date ? new Date(campaign.next_activity.scheduled_date).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">
          {campaign.playbook_templates?.name || 'No playbook'}
        </span>
        <div className="flex items-center">
          {campaign.profiles?.full_name ? (
            <div className="flex items-center text-xs text-slate-600">
              <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs font-medium text-cyan-700">
                  {getInitials(campaign.profiles.full_name)}
                </span>
              </div>
              <span className="hidden sm:inline">
                {campaign.profiles.full_name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-400">
              <User className="w-4 h-4 mr-1" />
              <span>Unassigned</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
