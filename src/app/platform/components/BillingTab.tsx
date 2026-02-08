'use client'

import { CreditCard } from 'lucide-react'

export function BillingTab() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Billing & Refunds</h3>
        <p className="text-slate-500 mb-6">Coming soon. This section will provide full billing management capabilities.</p>
        <ul className="text-sm text-slate-500 space-y-2 text-left">
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <span>Subscription management</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <span>Invoice history</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <span>Refund processing</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <span>Usage analytics</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
