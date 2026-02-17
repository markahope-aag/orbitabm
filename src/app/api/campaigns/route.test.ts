/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabaseClient, createMockQueryBuilder } from '@/__tests__/mocks/supabase'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440000'
const COMPANY_ID = '880e8400-e29b-41d4-a716-446655440000'
const MARKET_ID = '990e8400-e29b-41d4-a716-446655440000'
const VERTICAL_ID = 'aa0e8400-e29b-41d4-a716-446655440000'

const { GET, POST } = await import('./route')

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any)
}

describe('GET /api/campaigns', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 403 when unauthenticated', async () => {
    const client = createMockSupabaseClient()
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest('/api/campaigns'))
    expect(res.status).toBe(403)
  })

  it('returns 200 with data for authenticated user', async () => {
    const campaigns = [{ id: 'camp1', name: 'Campaign A' }]
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        campaigns: { data: campaigns, error: null, count: 1 },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await GET(makeRequest('/api/campaigns'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual(campaigns)
  })
})

describe('POST /api/campaigns', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 403 when unauthenticated', async () => {
    const client = createMockSupabaseClient()
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(
      makeRequest('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          organization_id: ORG_ID,
          company_id: COMPANY_ID,
          market_id: MARKET_ID,
          vertical_id: VERTICAL_ID,
        }),
      })
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing required fields', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
      },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(
      makeRequest('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name: 'No IDs' }), // missing company_id, market_id, vertical_id
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 201 on successful create', async () => {
    const created = {
      id: 'camp-new',
      name: 'New Campaign',
      organization_id: ORG_ID,
      company_id: COMPANY_ID,
      market_id: MARKET_ID,
      vertical_id: VERTICAL_ID,
    }
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
        companies: { data: { id: COMPANY_ID, name: 'Co' }, error: null },
        markets: { data: { id: MARKET_ID }, error: null },
        verticals: { data: { id: VERTICAL_ID }, error: null },
      },
    })

    // campaigns is called twice: dup-check (should find nothing) then insert (returns created row)
    const dupCheckBuilder = createMockQueryBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const insertBuilder = createMockQueryBuilder({ data: created, error: null })
    let campaignCallCount = 0
    const originalFrom = client.from
    client.from = vi.fn((table: string) => {
      if (table === 'campaigns') {
        campaignCallCount++
        return campaignCallCount === 1 ? dupCheckBuilder : insertBuilder
      }
      return originalFrom(table)
    }) as any

    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(
      makeRequest('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Campaign',
          organization_id: ORG_ID,
          company_id: COMPANY_ID,
          market_id: MARKET_ID,
          vertical_id: VERTICAL_ID,
        }),
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('New Campaign')
  })
})
