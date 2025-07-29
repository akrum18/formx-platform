import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface Finish {
  id: string
  name: string
  type: string
  costPerSqIn: number
  leadTimeDays: number
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateFinishData {
  name: string
  type: string
  costPerSqIn: number
  leadTimeDays: number
  description?: string
  active?: boolean
}

export interface UpdateFinishData {
  name?: string
  type?: string
  costPerSqIn?: number
  leadTimeDays?: number
  description?: string
  active?: boolean
}

// API client
class FinishesAPI {
  private baseUrl = '/api/v2/finishes'

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

  async getFinishes(filters?: { active?: boolean; type?: string }): Promise<Finish[]> {
    const params = new URLSearchParams()
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }
    if (filters?.type) {
      params.append('type', filters.type)
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Finish[]>(url)
  }

  async getFinish(id: string): Promise<Finish> {
    return this.request<Finish>(`${this.baseUrl}/${id}`)
  }

  async createFinish(data: CreateFinishData): Promise<Finish> {
    return this.request<Finish>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFinish(id: string, data: UpdateFinishData): Promise<Finish> {
    return this.request<Finish>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteFinish(id: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }
}

const finishesAPI = new FinishesAPI()

// Query keys
export const finishesKeys = {
  all: ['finishes'] as const,
  lists: () => [...finishesKeys.all, 'list'] as const,
  list: (filters?: { active?: boolean; type?: string }) => 
    [...finishesKeys.lists(), filters] as const,
  details: () => [...finishesKeys.all, 'detail'] as const,
  detail: (id: string) => [...finishesKeys.details(), id] as const,
}

// React Query hooks
export function useFinishes(filters?: { active?: boolean; type?: string }) {
  return useQuery({
    queryKey: finishesKeys.list(filters),
    queryFn: () => finishesAPI.getFinishes(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useFinish(id: string) {
  return useQuery({
    queryKey: finishesKeys.detail(id),
    queryFn: () => finishesAPI.getFinish(id),
    enabled: !!id,
  })
}

export function useCreateFinish() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateFinishData) => finishesAPI.createFinish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: finishesKeys.lists() })
    },
  })
}

export function useUpdateFinish() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFinishData }) =>
      finishesAPI.updateFinish(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: finishesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finishesKeys.detail(variables.id) })
    },
  })
}

export function useDeleteFinish() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => finishesAPI.deleteFinish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: finishesKeys.lists() })
    },
  })
}

// Toggle finish active status
export function useToggleFinishActive() {
  const updateFinish = useUpdateFinish()
  
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateFinish.mutateAsync({ id, data: { active } }),
  })
}