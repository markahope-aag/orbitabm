// Set environment variables BEFORE any imports that touch config.ts
;(process.env as Record<string, string>).NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.test-key'

import { vi } from 'vitest'

// Mock next/headers — cookies() used by createClient in supabase/server.ts
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: () => {},
  }),
}))

// Mock audit logging — no-ops so route tests don't write audit records
vi.mock('@/lib/audit', () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
}))
