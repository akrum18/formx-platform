import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface QuotePart {
  id: string
  partId: string
  quantity: number
  basePrice: number
  materialCost: number
  finishingCost: number
  multiplier: number
  discountPercent: number
  discountAmount: number
  finalPricePerUnit: number
  totalPrice: number
  part: {
    id: string
    partName: string
    fileName: string
  }
}

export interface Quote {
  id: string
  quoteNumber: string
  rfqId: string
  customerId: string
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Expired'
  subtotal: number
  discounts: number
  total: number
  tier: 'economy' | 'standard' | 'rush'
  validUntil: string
  sentDate?: string
  approvedDate?: string
  rejectedDate?: string
  rejectionReason?: string
  internalNotes?: any[]
  breakdown: any
  customer: {
    id: string
    name: string
    email: string
    company?: string
  }
  rfq: {
    id: string
    rfqNumber: string
    submittedDate?: string
    customerNotes?: string
  }
  parts: QuotePart[]
  files: Array<{
    id: string
    fileName: string
    originalName: string
    fileSize: number
    mimeType: string
    fileUrl: string
  }>
  orders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    orderDate: string
  }>
  createdAt: string
  updatedAt: string
}

export interface CreateQuoteData {
  rfqId: string
  customerId: string
  tier: 'economy' | 'standard' | 'rush'
  validDays?: number
  parts: Array<{
    partId: string
    quantity: number
    basePrice: number
    materialCost: number
    finishingCost: number
    multiplier: number
    discountPercent?: number
    discountAmount?: number
    finalPricePerUnit: number
    totalPrice: number
  }>
  subtotal: number
  discounts?: number
  total: number
  breakdown?: any
  internalNotes?: any[]
}

export interface UpdateQuoteData {
  status?: Quote['status']
  rejectionReason?: string
  internalNotes?: any[]
}

// API client
class QuotesAPI {
  private baseUrl = '/api/v2/quotes'

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

  async getQuotes(filters?: { 
    customerId?: string
    status?: string
    rfqId?: string
    limit?: number
  }): Promise<Quote[]> {
    const params = new URLSearchParams()
    if (filters?.customerId) {
      params.append('customerId', filters.customerId)
    }
    if (filters?.status) {
      params.append('status', filters.status)
    }
    if (filters?.rfqId) {
      params.append('rfqId', filters.rfqId)
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString())
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Quote[]>(url)
  }

  async getQuote(id: string): Promise<Quote> {
    return this.request<Quote>(`${this.baseUrl}/${id}`)
  }

  async createQuote(data: CreateQuoteData): Promise<Quote> {
    return this.request<Quote>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateQuote(id: string, data: UpdateQuoteData): Promise<Quote> {
    return this.request<Quote>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

const quotesAPI = new QuotesAPI()

// Query keys
export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (filters?: { customerId?: string; status?: string; rfqId?: string; limit?: number }) => 
    [...quoteKeys.lists(), filters] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
}

// React Query hooks
export function useQuotes(filters?: { 
  customerId?: string
  status?: string
  rfqId?: string
  limit?: number
}) {
  return useQuery({
    queryKey: quoteKeys.list(filters),
    queryFn: () => quotesAPI.getQuotes(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: quoteKeys.detail(id),
    queryFn: () => quotesAPI.getQuote(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: quotesAPI.createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
      // Also invalidate RFQ queries since quote creation updates RFQ status
      queryClient.invalidateQueries({ queryKey: ['rfqs'] })
    },
  })
}

export function useUpdateQuote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteData }) => 
      quotesAPI.updateQuote(id, data),
    onSuccess: (updatedQuote) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
      queryClient.setQueryData(quoteKeys.detail(updatedQuote.id), updatedQuote)
    },
  })
}