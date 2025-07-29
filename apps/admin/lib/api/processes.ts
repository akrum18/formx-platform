import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface Process {
  id: string
  name: string
  category: string
  setupTime: number
  hourlyRate: number
  minimumCost: number
  complexityMultiplier: number
  materials: string[]
  materialIds: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProcessData {
  name: string
  category: string
  setupTime: number
  hourlyRate: number
  minimumCost: number
  complexityMultiplier: number
  active?: boolean
}

export interface UpdateProcessData {
  name?: string
  category?: string
  setupTime?: number
  hourlyRate?: number
  minimumCost?: number
  complexityMultiplier?: number
  active?: boolean
}

// API client
class ProcessesAPI {
  private baseUrl = '/api/v2/processes'

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

  async getProcesses(filters?: { 
    active?: boolean; 
    category?: string 
  }): Promise<Process[]> {
    const params = new URLSearchParams()
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }
    if (filters?.category) {
      params.append('category', filters.category)
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Process[]>(url)
  }

  async getProcess(id: string): Promise<Process> {
    return this.request<Process>(`${this.baseUrl}/${id}`)
  }

  async createProcess(data: CreateProcessData): Promise<Process> {
    return this.request<Process>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProcess(id: string, data: UpdateProcessData): Promise<Process> {
    return this.request<Process>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProcess(id: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }
}

const processesAPI = new ProcessesAPI()

// Query keys
export const processesKeys = {
  all: ['processes'] as const,
  lists: () => [...processesKeys.all, 'list'] as const,
  list: (filters?: { active?: boolean; category?: string }) => 
    [...processesKeys.lists(), filters] as const,
  details: () => [...processesKeys.all, 'detail'] as const,
  detail: (id: string) => [...processesKeys.details(), id] as const,
}

// React Query hooks
export function useProcesses(filters?: { active?: boolean; category?: string }) {
  return useQuery({
    queryKey: processesKeys.list(filters),
    queryFn: () => processesAPI.getProcesses(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useProcess(id: string) {
  return useQuery({
    queryKey: processesKeys.detail(id),
    queryFn: () => processesAPI.getProcess(id),
    enabled: !!id,
  })
}

export function useCreateProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateProcessData) => processesAPI.createProcess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processesKeys.lists() })
    },
  })
}

export function useUpdateProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessData }) =>
      processesAPI.updateProcess(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: processesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: processesKeys.detail(variables.id) })
    },
  })
}

export function useDeleteProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => processesAPI.deleteProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processesKeys.lists() })
    },
  })
}

// Toggle process active status
export function useToggleProcessActive() {
  const updateProcess = useUpdateProcess()
  
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateProcess.mutateAsync({ id, data: { active } }),
  })
}

// Bulk operations
export function useBulkUpdateProcesses() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: UpdateProcessData }>) => {
      const results = await Promise.all(
        updates.map(({ id, data }) => processesAPI.updateProcess(id, data))
      )
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processesKeys.lists() })
    },
  })
}

// Helper hook for getting processes by category
export function useProcessesByCategory(category: string) {
  return useProcesses({ 
    category,
    active: true 
  })
}