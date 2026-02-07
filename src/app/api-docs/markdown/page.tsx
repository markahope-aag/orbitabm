import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Documentation - OrbitABM',
  description: 'Complete API documentation for OrbitABM platform',
}

export default function MarkdownApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
              <p className="mt-2 text-gray-600">
                Complete reference for OrbitABM REST API
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/api-docs"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Interactive Docs
              </Link>
              <a
                href="/api/openapi.json"
                target="_blank"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                OpenAPI Spec
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="prose max-w-none">
            <h2>Documentation Formats</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3">Interactive Documentation</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Explore and test API endpoints directly in your browser with Swagger UI.
                </p>
                <Link
                  href="/api-docs"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  Open Interactive Docs
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>

              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3">OpenAPI Specification</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Download the complete OpenAPI 3.0 specification for code generation and tooling.
                </p>
                <a
                  href="/api/openapi.json"
                  target="_blank"
                  className="inline-flex items-center text-green-600 hover:text-green-800 font-medium"
                >
                  Download OpenAPI JSON
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <h2>Quick Start</h2>
            
            <h3>Base URL</h3>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
              <div>Development: <code>http://localhost:3000/api</code></div>
              <div>Production: <code>https://your-domain.com/api</code></div>
            </div>

            <h3>Authentication</h3>
            <p>
              Currently, the API does not require authentication (MVP phase). All requests must include 
              the <code>organization_id</code> parameter for proper data isolation.
            </p>

            <h3>Response Format</h3>
            <p>All API responses follow a consistent structure:</p>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre><code>{`{
  "data": [...],
  "success": true,
  "count": 25
}`}</code></pre>
            </div>

            <h3>Error Handling</h3>
            <p>Error responses include detailed information:</p>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre><code>{`{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "success": false,
  "details": {...}
}`}</code></pre>
            </div>

            <h2>Available Endpoints</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 not-prose">
              {[
                { name: 'Companies', endpoints: 5, description: 'Manage target companies and prospects' },
                { name: 'Contacts', endpoints: 4, description: 'Manage contacts at target companies' },
                { name: 'Markets', endpoints: 4, description: 'Manage geographic markets' },
                { name: 'Verticals', endpoints: 4, description: 'Manage industry verticals' },
                { name: 'Campaigns', endpoints: 4, description: 'Manage ABM campaigns' },
                { name: 'Digital Snapshots', endpoints: 4, description: 'Track digital presence data' }
              ].map((api) => (
                <div key={api.name} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{api.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{api.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{api.endpoints} endpoints</span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Available</span>
                  </div>
                </div>
              ))}
            </div>

            <h2>Code Examples</h2>

            <h3>JavaScript/Node.js</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre><code>{`// List companies
const response = await fetch('/api/companies?organization_id=uuid', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const { data, success } = await response.json();

// Create company
const newCompany = await fetch('/api/companies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    organization_id: 'uuid',
    name: 'New Company',
    market_id: 'uuid',
    vertical_id: 'uuid',
    status: 'prospect'
  })
});`}</code></pre>
            </div>

            <h3>Python</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre><code>{`import requests

# List companies
response = requests.get(
    'http://localhost:3000/api/companies',
    params={'organization_id': 'uuid'}
)

data = response.json()

# Create company
new_company = requests.post(
    'http://localhost:3000/api/companies',
    json={
        'organization_id': 'uuid',
        'name': 'New Company',
        'market_id': 'uuid',
        'vertical_id': 'uuid',
        'status': 'prospect'
    }
)`}</code></pre>
            </div>

            <h3>cURL</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre><code>{`# List companies
curl -X GET "http://localhost:3000/api/companies?organization_id=uuid" \\
  -H "Content-Type: application/json"

# Create company
curl -X POST "http://localhost:3000/api/companies" \\
  -H "Content-Type: application/json" \\
  -d '{
    "organization_id": "uuid",
    "name": "New Company",
    "market_id": "uuid",
    "vertical_id": "uuid",
    "status": "prospect"
  }'`}</code></pre>
            </div>

            <h2>SDKs and Tools</h2>
            <p>
              Use the OpenAPI specification to generate client SDKs for your preferred programming language:
            </p>
            
            <ul>
              <li><a href="https://openapi-generator.tech/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">OpenAPI Generator</a> - Generate clients for 50+ languages</li>
              <li><a href="https://swagger.io/tools/swagger-codegen/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Swagger Codegen</a> - Official Swagger code generation tool</li>
              <li><a href="https://insomnia.rest/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Insomnia</a> - API testing with OpenAPI import</li>
              <li><a href="https://www.postman.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Postman</a> - API testing and collaboration</li>
            </ul>

            <h2>Support</h2>
            <p>
              For API support and questions:
            </p>
            <ul>
              <li>Check the <Link href="/api-docs" className="text-blue-600 hover:text-blue-800">interactive documentation</Link></li>
              <li>Review the <a href="https://github.com/markahope-aag/orbitabm/blob/main/orbit/docs/TROUBLESHOOTING.md" className="text-blue-600 hover:text-blue-800">troubleshooting guide</a></li>
              <li>Create an issue on <a href="https://github.com/markahope-aag/orbitabm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">GitHub</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}