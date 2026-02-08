import { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import type { AuditAction, AuditEntityType, AuditLogInsert } from '@/lib/types/database'

interface AuditContext {
  supabase: SupabaseClient
  request?: NextRequest
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getUserInfo(supabase: SupabaseClient) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      user_id: session?.user?.id ?? null,
      user_email: session?.user?.email ?? null,
    }
  } catch {
    return { user_id: null, user_email: null }
  }
}

function getRequestInfo(request?: NextRequest) {
  if (!request) return { ip_address: null, user_agent: null }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? null
  const ua = request.headers.get('user-agent') ?? null
  return { ip_address: ip, user_agent: ua }
}

const SKIP_FIELDS = new Set(['updated_at'])

function computeChanges(
  action: AuditAction,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): { old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null; changed_fields: string[] | null } {
  if (action === 'create') {
    return { old_values: null, new_values: newValues, changed_fields: null }
  }
  if (action === 'delete') {
    return { old_values: oldValues, new_values: null, changed_fields: null }
  }

  // action === 'update' — diff only changed fields
  if (!oldValues || !newValues) {
    return { old_values: oldValues, new_values: newValues, changed_fields: null }
  }

  const changedFields: string[] = []
  const diffOld: Record<string, unknown> = {}
  const diffNew: Record<string, unknown> = {}

  for (const key of Object.keys(newValues)) {
    if (SKIP_FIELDS.has(key)) continue
    const oldVal = oldValues[key]
    const newVal = newValues[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedFields.push(key)
      diffOld[key] = oldVal
      diffNew[key] = newVal
    }
  }

  if (changedFields.length === 0) return { old_values: null, new_values: null, changed_fields: null }

  return { old_values: diffOld, new_values: diffNew, changed_fields: changedFields }
}

async function writeLog(ctx: AuditContext, entry: AuditLogInsert) {
  try {
    await ctx.supabase.from('audit_logs').insert(entry)
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log a create action. Call after a successful insert.
 * `data` should be the returned row (must contain `id` and optionally `organization_id`).
 */
export function logCreate(
  ctx: AuditContext,
  entityType: AuditEntityType,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>,
) {
  // Fire-and-forget
  void (async () => {
    const [user, req] = await Promise.all([getUserInfo(ctx.supabase), Promise.resolve(getRequestInfo(ctx.request))])
    const { old_values, new_values, changed_fields } = computeChanges('create', null, data)
    await writeLog(ctx, {
      organization_id: (data.organization_id as string) ?? null,
      entity_type: entityType,
      entity_id: data.id as string,
      action: 'create',
      ...user,
      ...req,
      old_values,
      new_values,
      changed_fields,
      metadata: metadata ?? null,
    })
  })()
}

/**
 * Log an update action. Call after a successful update.
 * Pass the pre-fetched old row and the returned updated row.
 */
export function logUpdate(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  metadata?: Record<string, unknown>,
) {
  void (async () => {
    const [user, req] = await Promise.all([getUserInfo(ctx.supabase), Promise.resolve(getRequestInfo(ctx.request))])
    const { old_values, new_values, changed_fields } = computeChanges('update', oldValues, newValues)
    // Skip writing if nothing actually changed
    if (!changed_fields || changed_fields.length === 0) return
    await writeLog(ctx, {
      organization_id: (newValues.organization_id ?? oldValues.organization_id) as string | null,
      entity_type: entityType,
      entity_id: entityId,
      action: 'update',
      ...user,
      ...req,
      old_values,
      new_values,
      changed_fields,
      metadata: metadata ?? null,
    })
  })()
}

/**
 * Log a delete (soft-delete) action. Call after a successful soft delete.
 * `data` should contain at minimum `id` and `organization_id`.
 */
export function logDelete(
  ctx: AuditContext,
  entityType: AuditEntityType,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>,
) {
  void (async () => {
    const [user, req] = await Promise.all([getUserInfo(ctx.supabase), Promise.resolve(getRequestInfo(ctx.request))])
    const { old_values, new_values, changed_fields } = computeChanges('delete', data, null)
    await writeLog(ctx, {
      organization_id: (data.organization_id as string) ?? null,
      entity_type: entityType,
      entity_id: data.id as string,
      action: 'delete',
      ...user,
      ...req,
      old_values,
      new_values,
      changed_fields,
      metadata: metadata ?? null,
    })
  })()
}
