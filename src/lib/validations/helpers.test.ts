import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateRequest } from './helpers'

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
}).strict()

describe('validateRequest', () => {
  it('returns success with parsed data for valid input', () => {
    const result = validateRequest(testSchema, { name: 'Alice', age: 30 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'Alice', age: 30 })
    }
  })

  it('returns failure with 400 response for invalid input', async () => {
    const result = validateRequest(testSchema, { name: '', age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(400)
      const body = await result.response.json()
      expect(body.fields).toBeDefined()
      expect(body.error).toMatch(/Validation failed/)
    }
  })

  it('response body has fields object and error summary', async () => {
    const result = validateRequest(testSchema, { age: 'not a number' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const body = await result.response.json()
      // `name` is missing, `age` is wrong type — both should appear in fields
      expect(body.fields).toHaveProperty('name')
      expect(body.error).toContain('name')
    }
  })
})
