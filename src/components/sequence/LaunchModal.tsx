'use client'

import { X, CheckCircle, AlertTriangle, Rocket } from 'lucide-react'
import type { ChecklistItem } from '@/lib/sequence/types'

interface LaunchModalProps {
  open: boolean
  onClose: () => void
  onLaunch: () => void
  items: ChecklistItem[]
}

export function LaunchModal({ open, onClose, onLaunch, items }: LaunchModalProps) {
  if (!open) return null

  const allPassed = items.every((i) => i.passed)
  const failedItems = items.filter((i) => !i.passed)

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            {allPassed ? (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <Rocket className="w-6 h-6 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Ready to Launch</h3>
                </div>
                <p className="text-slate-600 mb-6">
                  All pre-launch checks pass. This will set the campaign status to active
                  and all scheduled activities to scheduled.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Not Fully Ready</h3>
                </div>
                <p className="text-slate-600 mb-4">
                  {failedItems.length} item{failedItems.length > 1 ? 's' : ''} not ready:
                </p>
                <div className="space-y-2 mb-6">
                  {failedItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                {allPassed ? 'Cancel' : 'Fix Issues'}
              </button>
              <button
                onClick={onLaunch}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              >
                {allPassed ? 'Launch Campaign' : 'Launch Anyway'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
