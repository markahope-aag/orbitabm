import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_ORG = '770e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440000'
const COMPANY_ID = '880e8400-e29b-41d4-a716-446655440000'

const { GET, PATCH, DELETE } = await import('./route')

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/companies/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 404 for non-existent company (PGRST116)', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest(`/api/companies/${COMPANY_ID}`), makeParams(COMPANY_ID))
    expect(res.status).toBe(404)
  })

  it('returns 403 when company org does not match user org', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: { id: COMPANY_ID, organization_id: OTHER_ORG }, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest(`/api/companies/${COMPANY_ID}`), makeParams(COMPANY_ID))
    expect(res.status).toBe(403)
  })

  it('returns 200 for correct org', async () => {
    const company = { id: COMPANY_ID, name: 'Acme', organization_id: ORG_ID }
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: company, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest(`/api/companies/${COMPANY_ID}`), makeParams(COMPANY_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(COMPANY_ID)
  })
})

describe('PATCH /api/companies/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 403 when old data org does not match', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        // The first .from('companies') call (oldData fetch) returns wrong org
        companies: { data: { id: COMPANY_ID, organization_id: OTHER_ORG }, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await PATCH(
      makeRequest(`/api/companies/${COMPANY_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }),
      makeParams(COMPANY_ID)
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 on successful update', async () => {
    const updated = { id: COMPANY_ID, name: 'Updated', organization_id: ORG_ID }
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: updated, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await PATCH(
      makeRequest(`/api/companies/${COMPANY_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }),
      makeParams(COMPANY_ID)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Updated')
  })
})

describe('DELETE /api/companies/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 403 for wrong org', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: { id: COMPANY_ID, organization_id: OTHER_ORG }, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await DELETE(makeRequest(`/api/companies/${COMPANY_ID}`, { method: 'DELETE' }), makeParams(COMPANY_ID))
    expect(res.status).toBe(403)
  })

  it('returns 200 on successful soft-delete', async () => {
    const deleted = { id: COMPANY_ID, organization_id: ORG_ID, deleted_at: '2026-01-01T00:00:00Z' }
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: deleted, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await DELETE(makeRequest(`/api/companies/${COMPANY_ID}`, { method: 'DELETE' }), makeParams(COMPANY_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deleted_at).toBeDefined()
  })
})
