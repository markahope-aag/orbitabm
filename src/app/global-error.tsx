'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Application Error
            </h2>

            <p className="text-slate-600 mb-6">
              A critical error occurred. Please refresh the page to continue.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-slate-800 break-all">
                  {error.message}
                </p>
              </div>
            )}

            <button
              onClick={reset}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
