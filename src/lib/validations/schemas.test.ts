import { describe, it, expect } from 'vitest'
import {
  createCompanySchema,
  updateCompanySchema,
  createCampaignSchema,
  createContactSchema,
} from './schemas'

// Must be a valid v4 UUID — Zod v4 validates the variant/version bits
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('createCompanySchema', () => {
  const validCompany = {
    organization_id: VALID_UUID,
    name: 'Acme Corp',
  }

  it('accepts valid minimal input', () => {
    const result = createCompanySchema.safeParse(validCompany)
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createCompanySchema.safeParse({ organization_id: VALID_UUID })
    expect(result.success).toBe(false)
  })

  it('rejects bad UUID for organization_id', () => {
    const result = createCompanySchema.safeParse({ ...validCompany, organization_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects unknown fields (strict)', () => {
    const result = createCompanySchema.safeParse({ ...validCompany, bogus: 'field' })
    expect(result.success).toBe(false)
  })
})

describe('updateCompanySchema', () => {
  it('accepts partial updates', () => {
    const result = updateCompanySchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = updateCompanySchema.safeParse({ name: 'New Name', bogus: 'field' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('bogus')
    }
  })
})

describe('createCampaignSchema', () => {
  it('rejects invalid status enum value', () => {
    const result = createCampaignSchema.safeParse({
      organization_id: VALID_UUID,
      name: 'Test Campaign',
      company_id: VALID_UUID,
      market_id: VALID_UUID,
      vertical_id: VALID_UUID,
      status: 'nonexistent_status',
    })
    expect(result.success).toBe(false)
  })
})

describe('createContactSchema', () => {
  const validContact = {
    organization_id: VALID_UUID,
    company_id: VALID_UUID,
    first_name: 'Jane',
    last_name: 'Doe',
  }

  it('rejects invalid email', () => {
    const result = createContactSchema.safeParse({ ...validContact, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts null optional fields', () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      title: null,
      email: null,
      phone: null,
      linkedin_url: null,
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})
