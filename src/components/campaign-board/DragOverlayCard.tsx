'use client'

import { CardContent } from './BoardCard'
import type { CampaignWithRelations } from './BoardCard'

interface DragOverlayCardProps {
  campaign: CampaignWithRelations
}

export default function DragOverlayCard({ campaign }: DragOverlayCardProps) {
  return (
    <div className="bg-white rounded-lg border-2 border-cyan-400 p-4 shadow-lg scale-105 cursor-grabbing">
      <CardContent campaign={campaign} />
    </div>
  )
}
