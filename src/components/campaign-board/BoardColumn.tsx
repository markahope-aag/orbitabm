'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import BoardCard from './BoardCard'
import type { CampaignWithRelations } from './BoardCard'

interface ColumnConfig {
  key: string
  label: string
  color: string
}

interface BoardColumnProps {
  column: ColumnConfig
  campaigns: CampaignWithRelations[]
}

export default function BoardColumn({ column, campaigns }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })

  const campaignIds = campaigns.map(c => c.id)

  return (
    <div
      className={`rounded-lg border-2 ${column.color} min-h-96 transition-colors ${isOver ? 'ring-2 ring-cyan-400 border-cyan-400' : ''}`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">{column.label}</h3>
          <span className="text-sm text-slate-500 bg-white px-2 py-1 rounded">
            {campaigns.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="p-4 space-y-3">
        <SortableContext items={campaignIds} strategy={verticalListSortingStrategy}>
          {campaigns.map((campaign) => (
            <BoardCard key={campaign.id} campaign={campaign} />
          ))}
        </SortableContext>

        {campaigns.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No campaigns</p>
          </div>
        )}
      </div>
    </div>
  )
}
