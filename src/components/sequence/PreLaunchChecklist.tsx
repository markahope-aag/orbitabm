'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'
import type { ChecklistItem } from '@/lib/sequence/types'

interface PreLaunchChecklistProps {
  items: ChecklistItem[]
}

export function PreLaunchChecklist({ items }: PreLaunchChecklistProps) {
  const [collapsed, setCollapsed] = useState(false)
  const passed = items.filter((i) => i.passed).length

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-semibold text-slate-900">Pre-Launch Checklist</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            passed === items.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {passed} of {items.length} ready
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-6 pb-5 border-t border-slate-100 pt-3">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                {item.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.passed ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
