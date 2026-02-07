'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface OperationalNotesProps {
  title: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function OperationalNotes({ title, value, onChange, onBlur }: OperationalNotesProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-6 pb-5 border-t border-slate-100 pt-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            rows={5}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
          />
        </div>
      )}
    </div>
  )
}
