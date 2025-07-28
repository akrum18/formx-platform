import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface Part {
  id: string
  partName: string
  quantity: number
  tolerance: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl?: string
  createdAt: string
  updatedAt: string
  process: {
    id: string
    name: string
    category: string
    setupTime?: number
    hourlyRate?: number
    minimumCost?: number
    complexityMultiplier?: number
  }
  material: {
    id: string
    name: string
    cost?: number
    markup?: number
    density?: number
    unit?: string
  }
  finish?: {
    id: string
    name: string
    type: string
    costPerSqIn?: number
    leadTimeDays?: number
  }
}

export interface CreatePartData {
  partName: string
  processId: string
  materialId: string
  finishId?: string
  quantity: number
  tolerance?: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl?: string
}

// API client
class PartsAPI {
  private baseUrl = '/api/v2/parts'

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

  async getParts(filters?: { 
    processId?: string
    materialId?: string
    active?: boolean 
  }): Promise<Part[]> {
    const params = new URLSearchParams()
    if (filters?.processId) {
      params.append('processId', filters.processId)
    }
    if (filters?.materialId) {
      params.append('materialId', filters.materialId)
    }
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Part[]>(url)
  }

  async createPart(data: CreatePartData): Promise<Part> {
    return this.request<Part>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

const partsAPI = new PartsAPI()

// Query keys
export const partsKeys = {
  all: ['parts'] as const,
  lists: () => [...partsKeys.all, 'list'] as const,
  list: (filters?: { processId?: string; materialId?: string; active?: boolean }) => 
    [...partsKeys.lists(), filters] as const,
}

// React Query hooks
export function useParts(filters?: { 
  processId?: string
  materialId?: string
  active?: boolean 
}) {
  return useQuery({
    queryKey: partsKeys.list(filters),
    queryFn: () => partsAPI.getParts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreatePart() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: partsAPI.createPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partsKeys.lists() })
    },
  })
}