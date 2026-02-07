'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { MERGE_FIELDS, MERGE_FIELD_CATEGORIES } from '@/lib/sequence/merge-fields'

interface MergeFieldsPanelProps {
  onInsert: (token: string) => void
}

export function MergeFieldsPanel({ onInsert }: MergeFieldsPanelProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-700">Available Merge Fields</span>
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
          {MERGE_FIELD_CATEGORIES.map((category) => {
            const fields = MERGE_FIELDS.filter((f) => f.category === category)
            return (
              <div key={category}>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {fields.map((field) => (
                    <button
                      key={field.token}
                      onClick={() => onInsert(field.token)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-slate-100 group"
                    >
                      <span className="font-mono text-slate-600">{field.token}</span>
                      <Copy className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
