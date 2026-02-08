import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440000'

// Must import AFTER vi.mock so the mock is in place
const { GET, POST } = await import('./route')

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any)
}

describe('GET /api/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when unauthenticated', async () => {
    const client = createMockSupabaseClient() // no user → resolveUserOrgId returns null
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest('/api/companies'))
    expect(res.status).toBe(403)
  })

  it('returns 200 with data for authenticated user', async () => {
    const companies = [{ id: 'c1', name: 'Acme' }]
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: companies, error: null, count: 1 },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest('/api/companies'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual(companies)
  })
})

describe('POST /api/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when unauthenticated', async () => {
    const client = createMockSupabaseClient()
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(
      makeRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name: 'NewCo', organization_id: ORG_ID }),
      })
    )
    // Validation passes first, then auth check → 403
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(
      makeRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ organization_id: 'bad-uuid' }), // missing name, bad uuid
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 and overrides org_id on successful create', async () => {
    const createdRow = { id: 'c1', name: 'NewCo', organization_id: ORG_ID }

    // Build a special mock: profiles returns org, companies insert chain returns created row
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: createdRow, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(
      makeRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name: 'NewCo', organization_id: ORG_ID }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.organization_id).toBe(ORG_ID)
  })
})
