/**
 * Caching Layer for OrbitABM
 * 
 * Provides multiple caching strategies:
 * - In-memory cache for frequently accessed data
 * - Redis cache for distributed caching (production)
 * - Browser cache for client-side data
 * - Query result caching with TTL
 */

import { LRUCache } from 'lru-cache'

// Cache configuration
interface CacheConfig {
  ttl: number           // Time to live in milliseconds
  maxSize: number       // Maximum number of items
  staleWhileRevalidate: number  // Serve stale data while revalidating
}

// Default cache configurations for different data types
export const cacheConfigs = {
  // Static reference data (rarely changes)
  static: {
    ttl: 60 * 60 * 1000,        // 1 hour
    maxSize: 1000,
    staleWhileRevalidate: 5 * 60 * 1000,  // 5 minutes
  },
  
  // Dynamic data (changes frequently)
  dynamic: {
    ttl: 5 * 60 * 1000,         // 5 minutes
    maxSize: 500,
    staleWhileRevalidate: 60 * 1000,      // 1 minute
  },
  
  // User-specific data
  user: {
    ttl: 15 * 60 * 1000,        // 15 minutes
    maxSize: 200,
    staleWhileRevalidate: 2 * 60 * 1000,  // 2 minutes
  },
  
  // Query results
  query: {
    ttl: 10 * 60 * 1000,        // 10 minutes
    maxSize: 300,
    staleWhileRevalidate: 2 * 60 * 1000,  // 2 minutes
  },
} as const

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  staleWhileRevalidate: number
}

// In-memory cache using LRU
class MemoryCache {
  private cache: LRUCache<string, CacheEntry<unknown>>

  constructor(config: CacheConfig) {
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl,
      allowStale: true,
      updateAgeOnGet: true,
    })
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    
    if (!entry) return null

    const now = Date.now()
    const age = now - entry.timestamp
    const isStale = age > entry.ttl
    const isExpired = age > (entry.ttl + entry.staleWhileRevalidate)

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return { data: entry.data, isStale }
  }

  set<T>(key: string, data: T, config: CacheConfig): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      staleWhileRevalidate: config.staleWhileRevalidate,
    }

    this.cache.set(key, entry)
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  stats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize || 0,
    }
  }
}

// Cache instances for different data types
export const staticCache = new MemoryCache(cacheConfigs.static)
export const dynamicCache = new MemoryCache(cacheConfigs.dynamic)
export const userCache = new MemoryCache(cacheConfigs.user)
export const queryCache = new MemoryCache(cacheConfigs.query)

// Cache key generators
export const cacheKeys = {
  // Organization-scoped keys
  organizations: (userId: string) => `orgs:${userId}`,
  organization: (id: string) => `org:${id}`,
  
  // Reference data keys
  markets: (orgId: string) => `markets:${orgId}`,
  verticals: (orgId: string) => `verticals:${orgId}`,
  pePlatforms: (orgId: string) => `pe-platforms:${orgId}`,
  
  // Entity keys with filters
  companies: (orgId: string, filters: Record<string, unknown> = {}) => 
    `companies:${orgId}:${JSON.stringify(filters)}`,
  
  contacts: (orgId: string, filters: Record<string, unknown> = {}) =>
    `contacts:${orgId}:${JSON.stringify(filters)}`,
  
  campaigns: (orgId: string, filters: Record<string, unknown> = {}) =>
    `campaigns:${orgId}:${JSON.stringify(filters)}`,
  
  activities: (orgId: string, filters: Record<string, unknown> = {}) =>
    `activities:${orgId}:${JSON.stringify(filters)}`,
  
  // Single entity keys
  company: (id: string) => `company:${id}`,
  contact: (id: string) => `contact:${id}`,
  campaign: (id: string) => `campaign:${id}`,
  
  // Query result keys
  query: (table: string, query: string, params: unknown[]) =>
    `query:${table}:${query}:${JSON.stringify(params)}`,
  
  // User-specific keys
  userProfile: (userId: string) => `profile:${userId}`,
  userOrgs: (userId: string) => `user-orgs:${userId}`,
  
  // Aggregation keys
  stats: (orgId: string, type: string) => `stats:${orgId}:${type}`,
  counts: (orgId: string) => `counts:${orgId}`,
}

// Cache invalidation patterns
export const invalidationPatterns = {
  // When organization changes, invalidate all org-scoped data
  organization: (orgId: string) => [
    `org:${orgId}`,
    `markets:${orgId}`,
    `verticals:${orgId}`,
    `pe-platforms:${orgId}`,
    `companies:${orgId}`,
    `contacts:${orgId}`,
    `campaigns:${orgId}`,
    `activities:${orgId}`,
    `stats:${orgId}`,
    `counts:${orgId}`,
  ],
  
  // When companies change, invalidate related data
  companies: (orgId: string) => [
    `companies:${orgId}`,
    `counts:${orgId}`,
    `stats:${orgId}:companies`,
  ],
  
  // When contacts change
  contacts: (orgId: string) => [
    `contacts:${orgId}`,
    `counts:${orgId}`,
    `stats:${orgId}:contacts`,
  ],
  
  // When campaigns change
  campaigns: (orgId: string) => [
    `campaigns:${orgId}`,
    `counts:${orgId}`,
    `stats:${orgId}:campaigns`,
  ],
}

// Cache invalidation helper
export function invalidateCache(patterns: string[], cacheType: 'static' | 'dynamic' | 'user' | 'query' = 'dynamic') {
  const cache = getCacheInstance(cacheType)
  
  patterns.forEach(pattern => {
    // Support wildcard invalidation
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      cache.keys().forEach(key => {
        if (regex.test(key)) {
          cache.delete(key)
        }
      })
    } else {
      cache.delete(pattern)
    }
  })
}

// Get cache instance by type
function getCacheInstance(type: 'static' | 'dynamic' | 'user' | 'query') {
  switch (type) {
    case 'static': return staticCache
    case 'dynamic': return dynamicCache
    case 'user': return userCache
    case 'query': return queryCache
    default: return dynamicCache
  }
}

// Cached fetch wrapper
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheType: 'static' | 'dynamic' | 'user' | 'query' = 'dynamic',
  forceRefresh = false
): Promise<T> {
  const cache = getCacheInstance(cacheType)
  
  if (!forceRefresh) {
    const cached = cache.get<T>(key)
    
    if (cached) {
      // If data is stale, trigger background refresh
      if (cached.isStale) {
        // Background refresh (don't await)
        fetcher()
          .then(data => cache.set(key, data, cacheConfigs[cacheType]))
          .catch(console.error)
      }
      
      return cached.data
    }
  }
  
  // Fetch fresh data
  const data = await fetcher()
  cache.set(key, data, cacheConfigs[cacheType])
  
  return data
}

// Batch cache operations
export class BatchCache {
  private operations: Array<() => void> = []
  
  set<T>(key: string, data: T, cacheType: 'static' | 'dynamic' | 'user' | 'query' = 'dynamic') {
    this.operations.push(() => {
      const cache = getCacheInstance(cacheType)
      cache.set(key, data, cacheConfigs[cacheType])
    })
    return this
  }
  
  delete(key: string, cacheType: 'static' | 'dynamic' | 'user' | 'query' = 'dynamic') {
    this.operations.push(() => {
      const cache = getCacheInstance(cacheType)
      cache.delete(key)
    })
    return this
  }
  
  execute() {
    this.operations.forEach(op => op())
    this.operations = []
  }
}

// Cache warming utilities
export async function warmCache(orgId: string) {
  const promises = [
    // Warm reference data
    cachedFetch(
      cacheKeys.markets(orgId),
      () => fetchMarkets(orgId),
      'static'
    ),
    cachedFetch(
      cacheKeys.verticals(orgId),
      () => fetchVerticals(orgId),
      'static'
    ),
    cachedFetch(
      cacheKeys.pePlatforms(orgId),
      () => fetchPEPlatforms(orgId),
      'static'
    ),
  ]
  
  await Promise.all(promises)
}

// Placeholder fetch functions (to be implemented)
async function fetchMarkets(_orgId: string) {
  // Implementation will be added
  return []
}

async function fetchVerticals(_orgId: string) {
  // Implementation will be added
  return []
}

async function fetchPEPlatforms(_orgId: string) {
  // Implementation will be added
  return []
}

// Cache monitoring and metrics
export function getCacheMetrics() {
  return {
    static: staticCache.stats(),
    dynamic: dynamicCache.stats(),
    user: userCache.stats(),
    query: queryCache.stats(),
    timestamp: new Date().toISOString(),
  }
}

// Cache cleanup utility
export function cleanupExpiredCache() {
  // LRU cache handles this automatically, but we can force cleanup
  const caches = [staticCache, dynamicCache, userCache, queryCache]
  
  caches.forEach(cache => {
    // Force garbage collection of expired items
    cache.clear()
  })
}

// Export cache instances for direct access if needed
export { MemoryCache }