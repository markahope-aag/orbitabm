'use client'

import { useState, useEffect } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSpec = async () => {
      try {
        const response = await fetch('/api/openapi.json')
        if (!response.ok) {
          throw new Error('Failed to load OpenAPI specification')
        }
        const openApiSpec = await response.json()
        setSpec(openApiSpec)
      } catch (err) {
        console.error('Error loading OpenAPI spec:', err)
        setError(err instanceof Error ? err.message : 'Failed to load API documentation')
      } finally {
        setLoading(false)
      }
    }

    loadSpec()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">OrbitABM API Documentation</h1>
              <p className="mt-2 text-gray-300">
                Interactive API documentation for the OrbitABM platform
              </p>
            </div>
            <div className="flex space-x-4">
              <a
                href="/api-docs/markdown"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Markdown Docs
              </a>
              <a
                href="https://github.com/markahope-aag/orbitabm"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {spec && (
          <SwaggerUI
            spec={spec}
            deepLinking={true}
            displayOperationId={false}
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            defaultModelRendering="example"
            displayRequestDuration={true}
            docExpansion="list"
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            requestInterceptor={(request) => {
              // Add any custom headers or modifications here
              console.log('API Request:', request)
              return request
            }}
            responseInterceptor={(response) => {
              // Handle responses here
              console.log('API Response:', response)
              return response
            }}
            onComplete={(system) => {
              console.log('Swagger UI loaded:', system)
            }}
          />
        )}
      </div>

      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>
              © 2024 OrbitABM. Built with{' '}
              <a 
                href="https://nextjs.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Next.js
              </a>{' '}
              and{' '}
              <a 
                href="https://swagger.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Swagger UI
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}