/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'
import { resolveUserOrgId } from './resolve-org'

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440000'

describe('resolveUserOrgId', () => {
  it('returns org ID for authenticated user with profile', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: ORG_ID }, error: null },
      },
    })

    const result = await resolveUserOrgId(client as any)
    expect(result).toBe(ORG_ID)
  })

  it('returns null when no session', async () => {
    const client = createMockSupabaseClient() // no user
    const result = await resolveUserOrgId(client as any)
    expect(result).toBeNull()
  })

  it('returns null when profile not found', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      },
    })

    const result = await resolveUserOrgId(client as any)
    expect(result).toBeNull()
  })

  it('returns null when profile has no organization_id', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: { organization_id: null }, error: null },
      },
    })

    const result = await resolveUserOrgId(client as any)
    expect(result).toBeNull()
  })

  it('returns null on exception (does not throw)', async () => {
    const client = createMockSupabaseClient({
      user: { id: USER_ID },
    })
    // Make auth.getSession throw
    client.auth.getSession.mockRejectedValue(new Error('boom'))

    const result = await resolveUserOrgId(client as any)
    expect(result).toBeNull()
  })
})
