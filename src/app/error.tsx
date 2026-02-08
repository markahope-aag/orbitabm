'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h2>

        <p className="text-slate-600 mb-6">
          This page encountered an error. Your sidebar and navigation still work
          &mdash; try again or head back to the dashboard.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-mono text-slate-800 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-slate-500 mt-2">Digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
