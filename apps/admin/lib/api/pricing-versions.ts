import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface PricingVersion {
  id: string
  version: string
  status: 'draft' | 'published' | 'archived'
  createdBy: string
  createdAt: string
  publishedAt: string | null
  description: string
  changes: string[]
  configSnapshot?: any // The actual pricing configuration at time of publish
}

export interface CreateVersionData {
  version: string
  description: string
  changes: string[]
  basedOnVersionId?: string
}

export interface UpdateVersionData {
  description?: string
  changes?: string[]
  status?: 'draft' | 'published' | 'archived'
}

export interface PublishResponse {
  publishedVersion: PricingVersion
  allVersions: PricingVersion[]
}

// API client
class PricingVersionsAPI {
  private baseUrl = '/api/v2/pricing-versions'

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

  async getVersions(filters?: { status?: string; createdBy?: string }): Promise<PricingVersion[]> {
    const params = new URLSearchParams()
    if (filters?.status) {
      params.append('status', filters.status)
    }
    if (filters?.createdBy) {
      params.append('createdBy', filters.createdBy)
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<PricingVersion[]>(url)
  }

  async getVersion(id: string): Promise<PricingVersion> {
    return this.request<PricingVersion>(`${this.baseUrl}/${id}`)
  }

  async createVersion(data: CreateVersionData): Promise<PricingVersion> {
    return this.request<PricingVersion>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateVersion(id: string, data: UpdateVersionData): Promise<PricingVersion> {
    return this.request<PricingVersion>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteVersion(id: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }

  async publishVersion(id: string): Promise<PublishResponse> {
    return this.request<PublishResponse>(`${this.baseUrl}/${id}/publish`, {
      method: 'POST',
    })
  }
}

const pricingVersionsAPI = new PricingVersionsAPI()

// Query keys
export const pricingVersionsKeys = {
  all: ['pricing-versions'] as const,
  lists: () => [...pricingVersionsKeys.all, 'list'] as const,
  list: (filters?: { status?: string; createdBy?: string }) => 
    [...pricingVersionsKeys.lists(), filters] as const,
  details: () => [...pricingVersionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...pricingVersionsKeys.details(), id] as const,
}

// React Query hooks
export function usePricingVersions(filters?: { status?: string; createdBy?: string }) {
  return useQuery({
    queryKey: pricingVersionsKeys.list(filters),
    queryFn: () => pricingVersionsAPI.getVersions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function usePricingVersion(id: string) {
  return useQuery({
    queryKey: pricingVersionsKeys.detail(id),
    queryFn: () => pricingVersionsAPI.getVersion(id),
    enabled: !!id,
  })
}

export function useCreatePricingVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateVersionData) => pricingVersionsAPI.createVersion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingVersionsKeys.lists() })
    },
  })
}

export function useUpdatePricingVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVersionData }) =>
      pricingVersionsAPI.updateVersion(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: pricingVersionsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: pricingVersionsKeys.detail(variables.id) })
    },
  })
}

export function useDeletePricingVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pricingVersionsAPI.deleteVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingVersionsKeys.lists() })
    },
  })
}

export function usePublishPricingVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pricingVersionsAPI.publishVersion(id),
    onSuccess: (data) => {
      // Update all versions in cache with the returned data
      queryClient.setQueryData(pricingVersionsKeys.list(), data.allVersions)
      queryClient.invalidateQueries({ queryKey: pricingVersionsKeys.lists() })
      // Also invalidate pricing config since publishing changes the active config
      queryClient.invalidateQueries({ queryKey: ['pricing-config'] })
    },
  })
}

// Utility functions
export function getStatusColor(status: string) {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-700 hover:bg-green-200"
    case "draft":
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
    case "archived":
      return "bg-slate-100 text-slate-600"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "published":
      return "✅"
    case "draft":
      return "📝"
    case "archived":
      return "📦"
    default:
      return "❓"
  }
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "—"
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function generateVersionNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  return `v${year}.${month}.${day}`
}