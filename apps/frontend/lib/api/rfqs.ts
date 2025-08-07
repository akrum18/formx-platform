import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface RFQPart {
  id: string
  partId: string
  quantity: number
  tolerance: string
  leadTime: string
  notes?: string
  part: {
    id: string
    partName: string
    fileName: string
    process: {
      id: string
      name: string
      category: string
    }
    material: {
      id: string
      name: string
    }
    finish?: {
      id: string
      name: string
      type: string
    }
  }
}

export interface RFQ {
  id: string
  rfqNumber: string
  customerId: string
  submittedDate: string
  status: 'Draft' | 'Submitted' | 'In Review' | 'Quoted' | 'Rejected'
  customerNotes?: string
  internalNotes?: Array<{
    id: string
    text: string
    author: string
    date: string
  }>
  estimatedCost?: number
  customer: {
    id: string
    name: string
    email: string
    company?: string
  }
  parts: RFQPart[]
  files: Array<{
    id: string
    fileName: string
    originalName: string
    fileSize: number
    mimeType: string
    fileUrl: string
  }>
  quotes: Array<{
    id: string
    quoteNumber: string
    status: string
    total: number
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

export interface CreateRFQData {
  customerId: string
  customerNotes?: string
  parts: Array<{
    partId: string
    quantity: number
    tolerance?: string
    leadTime?: string
    notes?: string
  }>
  fileIds?: string[]
}

export interface UpdateRFQData {
  status?: RFQ['status']
  customerNotes?: string
  internalNotes?: RFQ['internalNotes']
  estimatedCost?: number
}

// API client
class RFQsAPI {
  private baseUrl = '/api/v2/rfqs'

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

  async getRFQs(filters?: { 
    customerId?: string
    status?: string
    limit?: number
  }): Promise<RFQ[]> {
    const params = new URLSearchParams()
    if (filters?.customerId) {
      params.append('customerId', filters.customerId)
    }
    if (filters?.status) {
      params.append('status', filters.status)
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString())
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<RFQ[]>(url)
  }

  async getRFQ(id: string): Promise<RFQ> {
    return this.request<RFQ>(`${this.baseUrl}/${id}`)
  }

  async createRFQ(data: CreateRFQData): Promise<RFQ> {
    return this.request<RFQ>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRFQ(id: string, data: UpdateRFQData): Promise<RFQ> {
    return this.request<RFQ>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRFQ(id: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }
}

const rfqsAPI = new RFQsAPI()

// Query keys
export const rfqKeys = {
  all: ['rfqs'] as const,
  lists: () => [...rfqKeys.all, 'list'] as const,
  list: (filters?: { customerId?: string; status?: string; limit?: number }) => 
    [...rfqKeys.lists(), filters] as const,
  details: () => [...rfqKeys.all, 'detail'] as const,
  detail: (id: string) => [...rfqKeys.details(), id] as const,
}

// React Query hooks
export function useRFQs(filters?: { 
  customerId?: string
  status?: string
  limit?: number
}) {
  return useQuery({
    queryKey: rfqKeys.list(filters),
    queryFn: () => rfqsAPI.getRFQs(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useRFQ(id: string) {
  return useQuery({
    queryKey: rfqKeys.detail(id),
    queryFn: () => rfqsAPI.getRFQ(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  })
}

export function useCreateRFQ() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: rfqsAPI.createRFQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.lists() })
    },
  })
}

export function useUpdateRFQ() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRFQData }) => 
      rfqsAPI.updateRFQ(id, data),
    onSuccess: (updatedRFQ) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.lists() })
      queryClient.setQueryData(rfqKeys.detail(updatedRFQ.id), updatedRFQ)
    },
  })
}

export function useDeleteRFQ() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: rfqsAPI.deleteRFQ,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.lists() })
      queryClient.removeQueries({ queryKey: rfqKeys.detail(deletedId) })
    },
  })
}