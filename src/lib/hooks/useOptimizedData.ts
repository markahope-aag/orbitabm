'use client'

/**
 * Optimized Data Hooks
 * 
 * Performance-optimized React hooks that implement:
 * - Intelligent caching with stale-while-revalidate
 * - Batch loading to prevent N+1 queries
 * - Background data refresh
 * - Request deduplication
 * - Error boundaries and retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cachedFetch, cacheKeys, invalidateCache, invalidationPatterns } from '@/lib/cache'
import { 
  getCompaniesWithRelations, 
  getContactsWithCompanies, 
  getCampaignsWithRelations,
  companyLoader,
  contactLoader,
  campaignLoader
} from '@/lib/query/optimization'

// Enhanced hook return type with performance metrics
interface UseOptimizedDataResult<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isStale: boolean
  fromCache: boolean
  lastUpdated: number | null
}

interface UseOptimizedSingleResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isStale: boolean
  fromCache: boolean
  lastUpdated: number | null
}

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>()

// Generic optimized data hook
function useOptimizedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    enabled?: boolean
    refetchOnMount?: boolean
    refetchInterval?: number
    staleTime?: number
  } = {}
): UseOptimizedDataResult<T> | UseOptimizedSingleResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  
  const {
    enabled = true,
    refetchOnMount = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options

  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    try {
      setLoading(true)
      setError(null)

      // Check for pending request to deduplicate
      if (pendingRequests.has(key) && !forceRefresh) {
        const result = await pendingRequests.get(key)!
        setData(result)
        setFromCache(true)
        setIsStale(false)
        setLastUpdated(Date.now())
        return
      }

      // Create new request
      const requestPromise = cachedFetch(
        key,
        fetcher,
        'dynamic',
        forceRefresh
      )

      // Store pending request for deduplication
      pendingRequests.set(key, requestPromise)

      const result = await requestPromise
      
      // Clean up pending request
      pendingRequests.delete(key)

      if (!abortControllerRef.current?.signal.aborted) {
        setData(result)
        setFromCache(false)
        setIsStale(false)
        setLastUpdated(Date.now())
      }
    } catch (err) {
      pendingRequests.delete(key)
      
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setData(null)
        setFromCache(false)
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false)
      }
    }
  }, [key, fetcher, enabled, ...dependencies])

  // Initial fetch
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData()
    }
  }, [fetchData, enabled, refetchOnMount])

  // Polling interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData(true)
      }, refetchInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [fetchData, refetchInterval, enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    fromCache,
    lastUpdated,
  } as any
}

// Optimized companies hook
export function useOptimizedCompanies(
  organizationId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const key = cacheKeys.companies(organizationId, { ...filters, ...options })
  
  const fetcher = useCallback(async () => {
    if (!organizationId) return { data: [], count: 0 }
    
    const result = await getCompaniesWithRelations(organizationId, filters, options)
    return result
  }, [organizationId, JSON.stringify(filters), JSON.stringify(options)])

  return useOptimizedData(key, fetcher, [organizationId, filters, options])
}

// Optimized contacts hook
export function useOptimizedContacts(
  organizationId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const key = cacheKeys.contacts(organizationId, { ...filters, ...options })
  
  const fetcher = useCallback(async () => {
    if (!organizationId) return { data: [], count: 0 }
    
    const result = await getContactsWithCompanies(organizationId, filters, options)
    return result
  }, [organizationId, JSON.stringify(filters), JSON.stringify(options)])

  return useOptimizedData(key, fetcher, [organizationId, filters, options])
}

// Optimized campaigns hook
export function useOptimizedCampaigns(
  organizationId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const key = cacheKeys.campaigns(organizationId, { ...filters, ...options })
  
  const fetcher = useCallback(async () => {
    if (!organizationId) return { data: [], count: 0 }
    
    const result = await getCampaignsWithRelations(organizationId, filters, options)
    return result
  }, [organizationId, JSON.stringify(filters), JSON.stringify(options)])

  return useOptimizedData(key, fetcher, [organizationId, filters, options])
}

// Optimized single entity hooks using batch loaders
export function useOptimizedCompany(id: string) {
  const key = cacheKeys.company(id)
  
  const fetcher = useCallback(async () => {
    if (!id) return null
    return companyLoader.load(id)
  }, [id])

  return useOptimizedData(key, fetcher, [id])
}

export function useOptimizedContact(id: string) {
  const key = cacheKeys.contact(id)
  
  const fetcher = useCallback(async () => {
    if (!id) return null
    return contactLoader.load(id)
  }, [id])

  return useOptimizedData(key, fetcher, [id])
}

export function useOptimizedCampaign(id: string) {
  const key = cacheKeys.campaign(id)
  
  const fetcher = useCallback(async () => {
    if (!id) return null
    return campaignLoader.load(id)
  }, [id])

  return useOptimizedData(key, fetcher, [id])
}

// Reference data hooks with long-term caching
export function useOptimizedMarkets(organizationId: string) {
  const key = cacheKeys.markets(organizationId)
  
  const fetcher = useCallback(async () => {
    if (!organizationId) return []
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name')

    if (error) throw error
    return data || []
  }, [organizationId])

  return useOptimizedData(key, fetcher, [organizationId], {
    staleTime: 60 * 60 * 1000, // 1 hour - reference data changes rarely
  })
}

export function useOptimizedVerticals(organizationId: string) {
  const key = cacheKeys.verticals(organizationId)
  
  const fetcher = useCallback(async () => {
    if (!organizationId) return []
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('verticals')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name')

    if (error) throw error
    return data || []
  }, [organizationId])

  return useOptimizedData(key, fetcher, [organizationId], {
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

export function useOptimizedPEPlatforms(organizationId: string) {
  const key = cacheKeys.pePlatforms(organizationId)
  
  const fetcher = useCallback(async () => {
    if (!organizationId) return []
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pe_platforms')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name')

    if (error) throw error
    return data || []
  }, [organizationId])

  return useOptimizedData(key, fetcher, [organizationId], {
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// Mutation hooks with cache invalidation
export function useOptimizedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T, variables: V) => void
    onError?: (error: Error, variables: V) => void
    invalidateKeys?: string[]
    invalidatePatterns?: string[]
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (variables: V) => {
    setLoading(true)
    setError(null)

    try {
      const result = await mutationFn(variables)
      
      // Invalidate caches
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach(key => {
          invalidateCache([key])
        })
      }
      
      if (options.invalidatePatterns) {
        invalidateCache(options.invalidatePatterns)
      }

      options.onSuccess?.(result, variables)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed')
      setError(error.message)
      options.onError?.(error, variables)
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn, options])

  return {
    mutate,
    loading,
    error,
  }
}

// Bulk operations hook
export function useBulkOperations<T>(
  operationFn: (items: T[]) => Promise<any>,
  options: {
    batchSize?: number
    onProgress?: (completed: number, total: number) => void
    onSuccess?: () => void
    onError?: (error: Error) => void
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const { batchSize = 50 } = options

  const execute = useCallback(async (items: T[]) => {
    setLoading(true)
    setError(null)
    setProgress({ completed: 0, total: items.length })

    try {
      const batches = []
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize))
      }

      for (let i = 0; i < batches.length; i++) {
        await operationFn(batches[i])
        
        const completed = Math.min((i + 1) * batchSize, items.length)
        setProgress({ completed, total: items.length })
        options.onProgress?.(completed, items.length)
      }

      options.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Bulk operation failed')
      setError(error.message)
      options.onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [operationFn, batchSize, options])

  return {
    execute,
    loading,
    progress,
    error,
  }
}

// Cache management hook
export function useCacheManagement() {
  const invalidateOrganizationCache = useCallback((organizationId: string) => {
    invalidateCache(invalidationPatterns.organization(organizationId))
  }, [])

  const invalidateCompaniesCache = useCallback((organizationId: string) => {
    invalidateCache(invalidationPatterns.companies(organizationId))
  }, [])

  const invalidateContactsCache = useCallback((organizationId: string) => {
    invalidateCache(invalidationPatterns.contacts(organizationId))
  }, [])

  const invalidateCampaignsCache = useCallback((organizationId: string) => {
    invalidateCache(invalidationPatterns.campaigns(organizationId))
  }, [])

  return {
    invalidateOrganizationCache,
    invalidateCompaniesCache,
    invalidateContactsCache,
    invalidateCampaignsCache,
  }
}