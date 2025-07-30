import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface Material {
  id: string
  name: string
  cost: number
  markup: number
  density: number
  unit: string
  processes: string[]
  processIds: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateMaterialData {
  name: string
  cost: number
  markup: number
  density: number
  unit: string
  processIds?: string[]
  active?: boolean
}

export interface UpdateMaterialData {
  name?: string
  cost?: number
  markup?: number
  density?: number
  unit?: string
  processIds?: string[]
  active?: boolean
}

// API client
class MaterialsAPI {
  private baseUrl = '/api/v2/materials'

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('auth_token')
    
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

  async getMaterials(filters?: { 
    active?: boolean; 
    processId?: string 
  }): Promise<Material[]> {
    const params = new URLSearchParams()
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }
    if (filters?.processId) {
      params.append('processId', filters.processId)
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Material[]>(url)
  }

  async getMaterial(id: string): Promise<Material> {
    return this.request<Material>(`${this.baseUrl}/${id}`)
  }

  async createMaterial(data: CreateMaterialData): Promise<Material> {
    return this.request<Material>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateMaterial(id: string, data: UpdateMaterialData): Promise<Material> {
    return this.request<Material>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteMaterial(id: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }
}

const materialsAPI = new MaterialsAPI()

// Query keys
export const materialsKeys = {
  all: ['materials'] as const,
  lists: () => [...materialsKeys.all, 'list'] as const,
  list: (filters?: { active?: boolean; processId?: string }) => 
    [...materialsKeys.lists(), filters] as const,
  details: () => [...materialsKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialsKeys.details(), id] as const,
}

// React Query hooks
export function useMaterials(filters?: { active?: boolean; processId?: string }) {
  return useQuery({
    queryKey: materialsKeys.list(filters),
    queryFn: () => materialsAPI.getMaterials(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: materialsKeys.detail(id),
    queryFn: () => materialsAPI.getMaterial(id),
    enabled: !!id,
  })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateMaterialData) => materialsAPI.createMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.lists() })
    },
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaterialData }) =>
      materialsAPI.updateMaterial(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialsKeys.detail(variables.id) })
    },
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => materialsAPI.deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.lists() })
    },
  })
}

// Toggle material active status
export function useToggleMaterialActive() {
  const updateMaterial = useUpdateMaterial()
  
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateMaterial.mutateAsync({ id, data: { active } }),
  })
}

// Bulk operations
export function useBulkUpdateMaterials() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: UpdateMaterialData }>) => {
      const results = await Promise.all(
        updates.map(({ id, data }) => materialsAPI.updateMaterial(id, data))
      )
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.lists() })
    },
  })
}

// Helper hook for getting materials by process
export function useMaterialsByProcess(processId: string) {
  return useMaterials({ 
    processId,
    active: true 
  })
}