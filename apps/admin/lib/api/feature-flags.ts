import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  category: 'Processes' | 'Finishes' | 'Pricing' | 'Experimental'
  createdAt: string
  updatedAt: string
}

export interface CreateFeatureFlagData {
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  category: 'Processes' | 'Finishes' | 'Pricing' | 'Experimental'
}

export interface UpdateFeatureFlagData {
  name?: string
  description?: string
  enabled?: boolean
  rolloutPercentage?: number
  category?: 'Processes' | 'Finishes' | 'Pricing' | 'Experimental'
}

export interface FeatureFlagFilters {
  search?: string
  category?: string
  enabled?: boolean
}

class FeatureFlagAPI {
  private baseUrl = '/api/v2/feature-flags'

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken')
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred'
      }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async getFeatureFlags(filters?: FeatureFlagFilters): Promise<FeatureFlag[]> {
    const params = new URLSearchParams()
    
    if (filters?.search) {
      params.append('search', filters.search)
    }
    if (filters?.category) {
      params.append('category', filters.category)
    }
    if (filters?.enabled !== undefined) {
      params.append('enabled', filters.enabled.toString())
    }
    
    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<FeatureFlag[]>(url)
  }

  async getFeatureFlag(id: string): Promise<FeatureFlag> {
    return this.request<FeatureFlag>(`${this.baseUrl}/${id}`)
  }

  async createFeatureFlag(data: CreateFeatureFlagData): Promise<FeatureFlag> {
    return this.request<FeatureFlag>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFeatureFlag(id: string, data: UpdateFeatureFlagData): Promise<FeatureFlag> {
    return this.request<FeatureFlag>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    await this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }
}

const featureFlagAPI = new FeatureFlagAPI()

export const featureFlagKeys = {
  all: ['feature-flags'] as const,
  lists: () => [...featureFlagKeys.all, 'list'] as const,
  list: (filters?: FeatureFlagFilters) => [...featureFlagKeys.lists(), filters] as const,
  details: () => [...featureFlagKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureFlagKeys.details(), id] as const,
}

export function useFeatureFlags(filters?: FeatureFlagFilters) {
  return useQuery({
    queryKey: featureFlagKeys.list(filters),
    queryFn: () => featureFlagAPI.getFeatureFlags(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useFeatureFlag(id: string) {
  return useQuery({
    queryKey: featureFlagKeys.detail(id),
    queryFn: () => featureFlagAPI.getFeatureFlag(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  })
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateFeatureFlagData) => featureFlagAPI.createFeatureFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() })
    },
  })
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeatureFlagData }) => 
      featureFlagAPI.updateFeatureFlag(id, data),
    onSuccess: (updatedFlag) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() })
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.detail(updatedFlag.id) })
    },
  })
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => featureFlagAPI.deleteFeatureFlag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() })
    },
  })
}