import { NextResponse } from 'next/server'
import { ZodError, type ZodSchema } from 'zod'

type ValidationSuccess<T> = { success: true; data: T }
type ValidationFailure = { success: false; response: NextResponse }

export function validateRequest<T>(
  schema: ZodSchema<T>,
  body: unknown
): ValidationSuccess<T> | ValidationFailure {
  const result = schema.safeParse(body)

  if (!result.success) {
    const fields: Record<string, string[]> = {}
    for (const issue of (result.error as ZodError).issues) {
      const key = issue.path.join('.') || '_root'
      if (!fields[key]) fields[key] = []
      fields[key].push(issue.message)
    }

    const summary = Object.entries(fields)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ')

    return {
      success: false,
      response: NextResponse.json(
        { error: `Validation failed: ${summary}`, fields },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: result.data }
}
