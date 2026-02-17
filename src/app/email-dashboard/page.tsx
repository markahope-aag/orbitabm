'use client'

import { useState } from 'react'
import { EmailDashboardStats } from '@/components/email/EmailDashboardStats'
import { EmailQueueTable } from '@/components/email/EmailQueueTable'
import { EmailPreviewSlideOver } from '@/components/email/EmailPreviewSlideOver'
import { PageHeader } from '@/components/ui/PageHeader'
import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EmailDashboardPage() {
  const router = useRouter()
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [slideOverOpen, setSlideOverOpen] = useState(false)

  function handleRowClick(send: { id: string }) {
    setSelectedEmailId(send.id)
    setSlideOverOpen(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Email Dashboard"
        description="Monitor email sending, engagement, and delivery across all campaigns"
        action={{
          label: 'Email Settings',
          icon: Settings,
          onClick: () => router.push('/settings?tab=email'),
          variant: 'secondary',
        }}
      />

      <EmailDashboardStats />

      <div className="space-y-6">
        <EmailQueueTable
          status="queued"
          limit={20}
          title="Upcoming Sends"
          onRowClick={handleRowClick}
        />

        <EmailQueueTable
          limit={50}
          title="Recent Sends"
          onRowClick={handleRowClick}
        />
      </div>

      <EmailPreviewSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        emailSendId={selectedEmailId}
      />
    </div>
  )
}
