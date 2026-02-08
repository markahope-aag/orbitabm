import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Chainable query builder mock
// ---------------------------------------------------------------------------

export interface MockQueryResult {
  data: unknown
  error: unknown
  count?: number
}

export function createMockQueryBuilder(result: MockQueryResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {}

  // Every chainable method returns `builder` so calls can be chained
  const chainMethods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'is', 'in', 'gt', 'lt', 'gte', 'lte',
    'like', 'ilike', 'contains', 'containedBy',
    'range', 'order', 'limit', 'single', 'maybeSingle',
    'or', 'not', 'filter', 'match',
    'textSearch', 'csv',
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  // The builder itself is thenable — awaiting it resolves to `result`
  builder.then = (resolve: (v: MockQueryResult) => void) => {
    resolve(result)
    return builder
  }

  return builder
}

// ---------------------------------------------------------------------------
// Full mock Supabase client
// ---------------------------------------------------------------------------

export interface MockClientOptions {
  /** If provided, auth.getSession() returns a session with this user */
  user?: { id: string; email?: string }
  /** Per-table query results: `.from(table)` returns a builder with that result */
  tables?: Record<string, MockQueryResult>
  /** Default result for tables not listed in `tables` */
  defaultResult?: MockQueryResult
}

export function createMockSupabaseClient(options: MockClientOptions = {}) {
  const { user, tables = {}, defaultResult = { data: null, error: null } } = options

  const session = user
    ? { user: { id: user.id, email: user.email ?? `${user.id}@test.com` } }
    : null

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: session?.user ?? null },
      error: null,
    }),
  }

  const from = vi.fn((table: string) => {
    const result = tables[table] ?? defaultResult
    return createMockQueryBuilder(result)
  })

  return { auth, from }
}

// ---------------------------------------------------------------------------
// Helper to install the mock via vi.mock('@/lib/supabase/server')
// ---------------------------------------------------------------------------

/**
 * Call inside each test file:
 *
 * ```ts
 * const mockClient = createMockSupabaseClient({ user: { id: '...' } })
 * vi.mocked(createClient).mockResolvedValue(mockClient as any)
 * ```
 */
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>
