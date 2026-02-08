/**
 * Shared normalization functions mirroring the SQL functions
 * extract_domain() and normalize_entity_name() from migration 017.
 */

/** Strip protocol, www., path/query/port → lowercase domain or null */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  let result = url.trim()
  if (!result) return null

  // Strip protocol
  result = result.replace(/^https?:\/\//i, '')
  // Strip www.
  result = result.replace(/^www\./i, '')
  // Strip path, query, fragment
  result = result.replace(/[/?#].*$/, '')
  // Strip port
  result = result.replace(/:\d+$/, '')
  // Lowercase
  result = result.toLowerCase().trim()

  return result || null
}

/** Lowercase, trim, strip non-alphanumeric (keep spaces), collapse whitespace */
export function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null
  let result = name.toLowerCase().trim()
  // Strip non-alphanumeric except spaces
  result = result.replace(/[^a-z0-9 ]/g, '')
  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim()

  return result || null
}

/** Add https:// prefix if missing, trim whitespace */
export function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
