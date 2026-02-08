/**
 * Query Optimization Utilities
 * 
 * Provides utilities to prevent N+1 queries and optimize database performance:
 * - Batch loading with DataLoader pattern
 * - Query result caching
 * - Eager loading with joins
 * - Query batching and deduplication
 */

import { createClient } from '@/lib/supabase/server'
import { cachedFetch, cacheKeys, dynamicCache, staticCache } from '@/lib/cache'
import { extractDomain } from '@/lib/utils/normalize'

// DataLoader-like batch loading utility
class BatchLoader<K, V> {
  private batchLoadFn: (keys: readonly K[]) => Promise<V[]>
  private cache = new Map<string, Promise<V>>()
  private batch: K[] = []
  private batchPromise: Promise<V[]> | null = null

  constructor(batchLoadFn: (keys: readonly K[]) => Promise<V[]>) {
    this.batchLoadFn = batchLoadFn
  }

  load(key: K): Promise<V> {
    const cacheKey = JSON.stringify(key)
    
    // Return cached promise if exists
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Add to batch
    this.batch.push(key)
    
    // Create promise for this key
    const promise = this.getBatchPromise().then(results => {
      const index = this.batch.indexOf(key)
      return results[index]
    })
    
    this.cache.set(cacheKey, promise)
    
    // Schedule batch execution
    if (!this.batchPromise) {
      this.batchPromise = Promise.resolve().then(() => this.executeBatch())
    }
    
    return promise
  }

  private getBatchPromise(): Promise<V[]> {
    if (!this.batchPromise) {
      this.batchPromise = Promise.resolve().then(() => this.executeBatch())
    }
    return this.batchPromise
  }

  private async executeBatch(): Promise<V[]> {
    const currentBatch = [...this.batch]
    this.batch = []
    this.batchPromise = null
    
    if (currentBatch.length === 0) {
      return []
    }
    
    try {
      return await this.batchLoadFn(currentBatch)
    } catch (error) {
      // Clear cache for failed requests
      currentBatch.forEach(key => {
        this.cache.delete(JSON.stringify(key))
      })
      throw error
    }
  }

  clear(): void {
    this.cache.clear()
    this.batch = []
    this.batchPromise = null
  }
}

// Batch loaders for common entities
export const companyLoader = new BatchLoader(async (ids: readonly string[]) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      markets (id, name),
      verticals (id, name)
    `)
    .in('id', ids as string[])
    .is('deleted_at', null)

  if (error) throw error
  
  // Return results in the same order as requested IDs
  return ids.map(id => data?.find(item => item.id === id) || null)
})

export const contactLoader = new BatchLoader(async (ids: readonly string[]) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      companies (id, name, website)
    `)
    .in('id', ids as string[])
    .is('deleted_at', null)

  if (error) throw error
  
  return ids.map(id => data?.find(item => item.id === id) || null)
})

export const campaignLoader = new BatchLoader(async (ids: readonly string[]) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      companies (id, name),
      playbook_templates (id, name)
    `)
    .in('id', ids as string[])
    .is('deleted_at', null)

  if (error) throw error
  
  return ids.map(id => data?.find(item => item.id === id) || null)
})

// Optimized query builders
export class OptimizedQuery {
  private supabase: any
  private tableName: string
  private selectClause: string = '*'
  private joinClauses: string[] = []
  private whereConditions: Array<{ column: string; operator: string; value: any }> = []
  private orderBy: Array<{ column: string; ascending: boolean }> = []
  private limitValue?: number
  private offsetValue?: number
  private cacheKey?: string
  private cacheTTL: number = 5 * 60 * 1000 // 5 minutes default

  constructor(tableName: string) {
    this.tableName = tableName
  }

  async init() {
    this.supabase = await createClient()
    return this
  }

  select(columns: string) {
    this.selectClause = columns
    return this
  }

  // Eager loading with joins to prevent N+1
  eagerLoad(relationships: Record<string, string>) {
    const joinSelects = Object.entries(relationships)
      .map(([table, columns]) => `${table} (${columns})`)
      .join(', ')
    
    this.selectClause = this.selectClause === '*' 
      ? `*, ${joinSelects}`
      : `${this.selectClause}, ${joinSelects}`
    
    return this
  }

  where(column: string, operator: string, value: any) {
    this.whereConditions.push({ column, operator, value })
    return this
  }

  eq(column: string, value: any) {
    return this.where(column, 'eq', value)
  }

  in(column: string, values: any[]) {
    return this.where(column, 'in', values)
  }

  is(column: string, value: any) {
    return this.where(column, 'is', value)
  }

  order(column: string, ascending: boolean = true) {
    this.orderBy.push({ column, ascending })
    return this
  }

  limit(count: number) {
    this.limitValue = count
    return this
  }

  offset(count: number) {
    this.offsetValue = count
    return this
  }

  // Enable caching for this query
  cache(key: string, ttl: number = 5 * 60 * 1000) {
    this.cacheKey = key
    this.cacheTTL = ttl
    return this
  }

  // Execute the optimized query
  async execute() {
    if (!this.supabase) {
      await this.init()
    }

    const queryKey = this.cacheKey || this.generateCacheKey()
    
    return cachedFetch(
      queryKey,
      () => this.executeQuery(),
      'query'
    )
  }

  private async executeQuery() {
    let query = this.supabase
      .from(this.tableName)
      .select(this.selectClause)

    // Apply where conditions
    this.whereConditions.forEach(({ column, operator, value }) => {
      switch (operator) {
        case 'eq':
          query = query.eq(column, value)
          break
        case 'in':
          query = query.in(column, value)
          break
        case 'gte':
          query = query.gte(column, value)
          break
        case 'lte':
          query = query.lte(column, value)
          break
        case 'is':
          query = query.is(column, value)
          break
        default:
          throw new Error(`Unsupported operator: ${operator}`)
      }
    })

    // Apply ordering
    this.orderBy.forEach(({ column, ascending }) => {
      query = query.order(column, { ascending })
    })

    // Apply pagination
    if (this.limitValue !== undefined) {
      const start = this.offsetValue || 0
      const end = start + this.limitValue - 1
      query = query.range(start, end)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Query failed: ${error.message}`)
    }

    return { data, count }
  }

  private generateCacheKey(): string {
    const queryHash = JSON.stringify({
      table: this.tableName,
      select: this.selectClause,
      where: this.whereConditions,
      order: this.orderBy,
      limit: this.limitValue,
      offset: this.offsetValue,
    })
    
    return `query:${this.tableName}:${Buffer.from(queryHash).toString('base64')}`
  }
}

// Optimized query functions for common patterns
export async function getCompaniesWithRelations(
  organizationId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const query = new OptimizedQuery('companies')
    .eagerLoad({
      markets: 'id, name',
      verticals: 'id, name',
      pe_platforms: 'id, name'
    })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .cache(cacheKeys.companies(organizationId, filters))

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.eq(key, value)
    }
  })

  // Apply pagination
  if (options.limit) {
    query.limit(options.limit)
  }
  if (options.offset) {
    query.offset(options.offset)
  }

  return query.execute()
}

export async function getContactsWithCompanies(
  organizationId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const query = new OptimizedQuery('contacts')
    .eagerLoad({
      companies: 'id, name, website, status'
    })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .cache(cacheKeys.contacts(organizationId, filters))

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.eq(key, value)
    }
  })

  // Apply pagination
  if (options.limit) {
    query.limit(options.limit)
  }
  if (options.offset) {
    query.offset(options.offset)
  }

  return query.execute()
}

export async function getCampaignsWithRelations(
  organizationId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const query = new OptimizedQuery('campaigns')
    .eagerLoad({
      companies: 'id, name, website',
      playbook_templates: 'id, name, description'
    })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .cache(cacheKeys.campaigns(organizationId, filters))

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.eq(key, value)
    }
  })

  // Apply pagination
  if (options.limit) {
    query.limit(options.limit)
  }
  if (options.offset) {
    query.offset(options.offset)
  }

  return query.execute()
}

// Batch operations to reduce round trips
export async function batchCreateCompanies(
  companies: any[],
  organizationId: string
) {
  const supabase = await createClient()
  
  // Batch insert with conflict resolution
  const { data, error } = await supabase
    .from('companies')
    .upsert(
      companies.map(company => ({
        ...company,
        organization_id: organizationId,
        domain: extractDomain(company.website),
      })),
      { 
        onConflict: 'organization_id,name',
        ignoreDuplicates: false 
      }
    )
    .select()

  if (error) throw error

  // Invalidate related caches
  dynamicCache.delete(cacheKeys.companies(organizationId))
  
  return data
}

// Query performance monitoring
export class QueryMonitor {
  private static queries: Array<{
    query: string
    duration: number
    timestamp: number
    cached: boolean
  }> = []

  static logQuery(query: string, duration: number, cached: boolean = false) {
    this.queries.push({
      query,
      duration,
      timestamp: Date.now(),
      cached,
    })

    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries = this.queries.slice(-1000)
    }
  }

  static getStats() {
    const recent = this.queries.filter(q => 
      Date.now() - q.timestamp < 60 * 60 * 1000 // Last hour
    )

    const totalQueries = recent.length
    const cachedQueries = recent.filter(q => q.cached).length
    const avgDuration = recent.reduce((sum, q) => sum + q.duration, 0) / totalQueries
    const slowQueries = recent.filter(q => q.duration > 1000).length

    return {
      totalQueries,
      cachedQueries,
      cacheHitRate: totalQueries > 0 ? cachedQueries / totalQueries : 0,
      avgDuration,
      slowQueries,
      slowQueryRate: totalQueries > 0 ? slowQueries / totalQueries : 0,
    }
  }

  static getSlowQueries(limit: number = 10) {
    return this.queries
      .filter(q => q.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }
}

// Query optimization recommendations
export function analyzeQueryPerformance() {
  const stats = QueryMonitor.getStats()
  const recommendations: string[] = []

  if (stats.cacheHitRate < 0.5) {
    recommendations.push('Consider increasing cache TTL or adding more caching')
  }

  if (stats.avgDuration > 500) {
    recommendations.push('Average query time is high - consider adding indexes or optimizing queries')
  }

  if (stats.slowQueryRate > 0.1) {
    recommendations.push('High number of slow queries detected - review query patterns')
  }

  return {
    stats,
    recommendations,
    slowQueries: QueryMonitor.getSlowQueries(),
  }
}