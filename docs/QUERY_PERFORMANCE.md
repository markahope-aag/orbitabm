# Query Performance Optimization

OrbitABM implements comprehensive query performance optimizations to prevent N+1 queries, reduce database load, and improve application responsiveness through intelligent caching and query batching.

## Overview

The performance optimization system includes:
- ✅ **Multi-layer caching** with stale-while-revalidate strategy
- ✅ **N+1 query prevention** using batch loading and eager loading
- ✅ **Query result caching** with intelligent invalidation
- ✅ **Request deduplication** to prevent duplicate API calls
- ✅ **Performance monitoring** and analytics
- ✅ **Automatic cache warming** for frequently accessed data

## Performance Issues Addressed

### 1. N+1 Query Problem

**Problem**: Loading a list of entities and then making separate queries for each entity's related data.

**Example of N+1 Pattern**:
```typescript
// BAD: N+1 queries
const companies = await getCompanies() // 1 query
for (const company of companies) {
  const market = await getMarket(company.market_id) // N queries
  const vertical = await getVertical(company.vertical_id) // N queries
}
```

**Solution**: Eager loading with joins
```typescript
// GOOD: Single query with joins
const companies = await supabase
  .from('companies')
  .select(`
    *,
    markets (id, name),
    verticals (id, name)
  `)
```

### 2. Cache Miss Cascades

**Problem**: When cache expires, multiple concurrent requests hit the database.

**Solution**: Stale-while-revalidate caching
```typescript
// Serve stale data immediately, refresh in background
const cached = cache.get(key)
if (cached.isStale) {
  // Return stale data immediately
  backgroundRefresh(key) // Refresh in background
  return cached.data
}
```

### 3. Redundant API Calls

**Problem**: Multiple components making the same API request simultaneously.

**Solution**: Request deduplication
```typescript
// Only one request is made, others wait for the result
if (pendingRequests.has(key)) {
  return pendingRequests.get(key)
}
```

## Caching Architecture

### Cache Layers

1. **Static Cache** - Long-lived reference data (1 hour TTL)
   - Markets, verticals, PE platforms
   - User profiles, organization settings
   - Template data, configuration

2. **Dynamic Cache** - Frequently changing data (5 minutes TTL)
   - Companies, contacts, campaigns
   - Activity feeds, recent updates
   - Search results, filtered lists

3. **User Cache** - User-specific data (15 minutes TTL)
   - User preferences, dashboard data
   - Personalized views, saved filters
   - Recent activity, notifications

4. **Query Cache** - Query result caching (10 minutes TTL)
   - Complex query results
   - Aggregated data, reports
   - Computed statistics

### Cache Configuration

```typescript
export const cacheConfigs = {
  static: {
    ttl: 60 * 60 * 1000,        // 1 hour
    maxSize: 1000,
    staleWhileRevalidate: 5 * 60 * 1000,  // 5 minutes
  },
  dynamic: {
    ttl: 5 * 60 * 1000,         // 5 minutes
    maxSize: 500,
    staleWhileRevalidate: 60 * 1000,      // 1 minute
  },
  // ... other configurations
}
```

### Cache Key Strategy

Hierarchical cache keys for efficient invalidation:

```typescript
export const cacheKeys = {
  // Organization-scoped keys
  companies: (orgId: string, filters: any) => 
    `companies:${orgId}:${JSON.stringify(filters)}`,
  
  // Single entity keys
  company: (id: string) => `company:${id}`,
  
  // Query result keys
  query: (table: string, query: string, params: any[]) =>
    `query:${table}:${query}:${JSON.stringify(params)}`,
}
```

## Query Optimization Techniques

### 1. Eager Loading with Joins

Prevent N+1 queries by loading related data in a single query:

```typescript
// Optimized companies query with relations
const query = new OptimizedQuery('companies')
  .eagerLoad({
    markets: 'id, name',
    verticals: 'id, name',
    pe_platforms: 'id, name'
  })
  .eq('organization_id', organizationId)
  .cache(cacheKey)
```

### 2. Batch Loading with DataLoader Pattern

Load multiple entities efficiently:

```typescript
export const companyLoader = new BatchLoader(async (ids: readonly string[]) => {
  const { data } = await supabase
    .from('companies')
    .select('*, markets(name), verticals(name)')
    .in('id', ids)
  
  // Return results in requested order
  return ids.map(id => data?.find(item => item.id === id) || null)
})

// Usage: Automatically batches requests
const company1 = await companyLoader.load('id1')
const company2 = await companyLoader.load('id2') // Batched with above
```

### 3. Query Result Caching

Cache complex query results with intelligent invalidation:

```typescript
export async function getCompaniesWithRelations(
  organizationId: string,
  filters: Record<string, any> = {}
) {
  return cachedFetch(
    cacheKeys.companies(organizationId, filters),
    async () => {
      // Execute optimized query
      return await executeComplexQuery()
    },
    'dynamic' // Cache type
  )
}
```

### 4. Request Deduplication

Prevent duplicate concurrent requests:

```typescript
const pendingRequests = new Map<string, Promise<any>>()

async function fetchData(key: string, fetcher: () => Promise<any>) {
  // Check for pending request
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }
  
  // Create new request
  const promise = fetcher()
  pendingRequests.set(key, promise)
  
  try {
    const result = await promise
    return result
  } finally {
    pendingRequests.delete(key)
  }
}
```

## React Hook Optimizations

### Optimized Data Hooks

Replace basic hooks with performance-optimized versions:

```typescript
// Before: Basic hook with potential N+1 issues
export function useCompanies(orgId: string) {
  const [companies, setCompanies] = useState([])
  
  useEffect(() => {
    // Fetch companies
    fetchCompanies(orgId).then(setCompanies)
  }, [orgId])
  
  // Later: Each company card makes separate API calls for market/vertical
  return companies
}

// After: Optimized hook with eager loading and caching
export function useOptimizedCompanies(orgId: string, filters = {}) {
  return useOptimizedData(
    cacheKeys.companies(orgId, filters),
    () => getCompaniesWithRelations(orgId, filters), // Includes relations
    [orgId, filters]
  )
}
```

### Batch Operations Hook

Handle bulk operations efficiently:

```typescript
export function useBulkOperations<T>(
  operationFn: (items: T[]) => Promise<any>,
  options: { batchSize?: number } = {}
) {
  const { batchSize = 50 } = options
  
  const execute = useCallback(async (items: T[]) => {
    // Process in batches to avoid overwhelming the database
    const batches = chunk(items, batchSize)
    
    for (const batch of batches) {
      await operationFn(batch)
    }
  }, [operationFn, batchSize])
  
  return { execute }
}
```

## Performance Monitoring

### Query Performance Tracking

Monitor query performance in real-time:

```typescript
export class QueryMonitor {
  static logQuery(query: string, duration: number, cached: boolean) {
    this.queries.push({
      query,
      duration,
      timestamp: Date.now(),
      cached,
    })
  }
  
  static getStats() {
    const recent = this.queries.filter(q => 
      Date.now() - q.timestamp < 60 * 60 * 1000 // Last hour
    )
    
    return {
      totalQueries: recent.length,
      cachedQueries: recent.filter(q => q.cached).length,
      avgDuration: recent.reduce((sum, q) => sum + q.duration, 0) / recent.length,
      slowQueries: recent.filter(q => q.duration > 1000).length,
    }
  }
}
```

### Performance Metrics API

Monitor performance via API endpoints:

```bash
# Get query performance statistics
GET /api/performance?metric=queries

# Get cache metrics
GET /api/performance?metric=cache

# Get slow query analysis
GET /api/performance?metric=slow-queries&limit=20

# Get comprehensive performance analysis
GET /api/performance?metric=analysis
```

### Performance Dashboard

Real-time performance monitoring:

```typescript
const performanceData = {
  queries: {
    total: 1250,
    cached: 875,
    cacheHitRate: 0.70,
    avgDuration: 145,
    slowQueries: 23,
  },
  cache: {
    static: { size: 245, hitRate: 0.95 },
    dynamic: { size: 432, hitRate: 0.68 },
    user: { size: 156, hitRate: 0.82 },
  },
  alerts: [
    {
      level: 'warning',
      message: 'Cache hit rate below optimal threshold',
      metric: 'cacheHitRate',
      value: 0.65,
    }
  ]
}
```

## Cache Invalidation Strategy

### Intelligent Cache Invalidation

Invalidate related caches when data changes:

```typescript
export const invalidationPatterns = {
  // When organization changes, invalidate all org-scoped data
  organization: (orgId: string) => [
    `org:${orgId}`,
    `companies:${orgId}*`,
    `contacts:${orgId}*`,
    `campaigns:${orgId}*`,
  ],
  
  // When companies change, invalidate related data
  companies: (orgId: string) => [
    `companies:${orgId}*`,
    `stats:${orgId}:companies`,
  ],
}

// Usage in mutations
export function useOptimizedMutation(mutationFn, options) {
  const mutate = async (variables) => {
    const result = await mutationFn(variables)
    
    // Invalidate related caches
    if (options.invalidatePatterns) {
      invalidateCache(options.invalidatePatterns)
    }
    
    return result
  }
}
```

### Background Cache Warming

Proactively warm caches for better performance:

```typescript
export async function warmCache(orgId: string) {
  const promises = [
    // Warm reference data
    cachedFetch(cacheKeys.markets(orgId), () => fetchMarkets(orgId), 'static'),
    cachedFetch(cacheKeys.verticals(orgId), () => fetchVerticals(orgId), 'static'),
    cachedFetch(cacheKeys.companies(orgId), () => fetchCompanies(orgId), 'dynamic'),
  ]
  
  await Promise.all(promises)
}
```

## Database Optimization Recommendations

### Index Strategy

Recommended database indexes for optimal performance:

```sql
-- Organization-scoped queries
CREATE INDEX idx_companies_org_id ON companies(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_org_id ON contacts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_org_id ON campaigns(organization_id) WHERE deleted_at IS NULL;

-- Filtered queries
CREATE INDEX idx_companies_status ON companies(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_market ON companies(organization_id, market_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_vertical ON companies(organization_id, vertical_id) WHERE deleted_at IS NULL;

-- Sorting and pagination
CREATE INDEX idx_companies_created ON companies(organization_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_updated ON campaigns(organization_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Join optimization
CREATE INDEX idx_contacts_company ON contacts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_campaign ON activities(campaign_id) WHERE deleted_at IS NULL;
```

### Query Optimization Guidelines

1. **Always use organization_id in WHERE clauses** for RLS and performance
2. **Include deleted_at IS NULL** in indexes and queries
3. **Use LIMIT and OFFSET** for pagination
4. **Avoid SELECT *** - specify needed columns
5. **Use joins instead of separate queries** for related data
6. **Batch INSERT/UPDATE operations** when possible

## Performance Testing

### Load Testing Scenarios

Test performance under various conditions:

```typescript
// Test N+1 query prevention
describe('N+1 Query Prevention', () => {
  test('should load companies with relations in single query', async () => {
    const startTime = Date.now()
    const companies = await getCompaniesWithRelations(orgId, {}, { limit: 100 })
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(500) // Should complete in < 500ms
    expect(companies.data).toHaveLength(100)
    expect(companies.data[0]).toHaveProperty('markets')
    expect(companies.data[0]).toHaveProperty('verticals')
  })
})

// Test cache performance
describe('Cache Performance', () => {
  test('should serve cached data quickly', async () => {
    // First request (cache miss)
    const start1 = Date.now()
    const result1 = await getCompanies(orgId)
    const duration1 = Date.now() - start1
    
    // Second request (cache hit)
    const start2 = Date.now()
    const result2 = await getCompanies(orgId)
    const duration2 = Date.now() - start2
    
    expect(duration2).toBeLessThan(duration1 * 0.1) // Cache should be 10x faster
    expect(result1).toEqual(result2)
  })
})
```

### Performance Benchmarks

Target performance metrics:

- **API Response Time**: < 200ms for cached data, < 500ms for fresh data
- **Cache Hit Rate**: > 70% overall, > 90% for reference data
- **Query Duration**: < 100ms for simple queries, < 500ms for complex queries
- **Memory Usage**: < 75% of available heap
- **Concurrent Users**: Support 100+ concurrent users without degradation

## Troubleshooting Performance Issues

### Common Performance Problems

1. **High Query Duration**
   - Check for missing indexes
   - Analyze query execution plans
   - Consider query optimization or caching

2. **Low Cache Hit Rate**
   - Review cache TTL settings
   - Check cache invalidation patterns
   - Consider cache warming strategies

3. **Memory Usage Issues**
   - Monitor cache size limits
   - Implement cache cleanup routines
   - Consider cache partitioning

4. **N+1 Query Detection**
   - Use query monitoring tools
   - Review component data loading patterns
   - Implement eager loading where needed

### Performance Monitoring Tools

1. **Query Monitor**: Track query performance and identify slow queries
2. **Cache Metrics**: Monitor cache hit rates and memory usage
3. **Performance API**: Real-time performance analytics
4. **Slow Query Log**: Identify and analyze problematic queries

### Performance Optimization Checklist

- [ ] All queries use appropriate indexes
- [ ] N+1 queries are eliminated with eager loading
- [ ] Caching is implemented for frequently accessed data
- [ ] Request deduplication prevents duplicate API calls
- [ ] Batch operations are used for bulk data changes
- [ ] Performance monitoring is active and alerting
- [ ] Cache invalidation patterns are optimized
- [ ] Database queries are optimized for RLS
- [ ] Pagination is implemented for large datasets
- [ ] Background cache warming is configured

## Related Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - System design overview
- [Database Schema](./DATABASE.md) - Database structure and relationships
- [API Documentation](./API.md) - API endpoint specifications
- [Testing Guide](./TESTING.md) - Performance testing procedures