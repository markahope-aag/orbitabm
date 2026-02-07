'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, Pencil } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function MarkdownEditor({ value, onChange, placeholder, readOnly }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>(readOnly ? 'preview' : 'edit')

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center px-2 py-1 text-xs font-medium rounded mr-1 ${
              mode === 'edit'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center px-2 py-1 text-xs font-medium rounded ${
              mode === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </button>
        </div>
      )}

      {/* Content */}
      {mode === 'edit' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[200px] p-4 font-mono text-sm text-slate-900 placeholder-slate-400 resize-y focus:outline-none"
        />
      ) : (
        <div className="p-4 min-h-[200px] prose prose-sm prose-slate max-w-none">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-slate-400 italic">{placeholder || 'No content yet.'}</p>
          )}
        </div>
      )}
    </div>
  )
}
