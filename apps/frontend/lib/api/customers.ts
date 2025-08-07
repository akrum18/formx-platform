import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  customerSince: string
  paymentStatus: string
  active: boolean
  lifetimeValue: number
  lastOrderDate?: string
  _count: {
    rfqs: number
    quotes: number
    orders: number
  }
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerData {
  name: string
  email: string
  phone?: string
  company?: string
  paymentStatus?: string
}

export interface UpdateCustomerData {
  name?: string
  email?: string
  phone?: string
  company?: string
  paymentStatus?: string
  active?: boolean
}

// API client
class CustomersAPI {
  private baseUrl = '/api/v2/customers'

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

  async getCustomers(filters?: { 
    search?: string
    active?: boolean
    limit?: number
  }): Promise<Customer[]> {
    const params = new URLSearchParams()
    if (filters?.search) {
      params.append('search', filters.search)
    }
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString())
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Customer[]>(url)
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.request<Customer>(`${this.baseUrl}/${id}`)
  }

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    return this.request<Customer>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    return this.request<Customer>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

const customersAPI = new CustomersAPI()

// Query keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: { search?: string; active?: boolean; limit?: number }) => 
    [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
}

// React Query hooks
export function useCustomers(filters?: { 
  search?: string
  active?: boolean
  limit?: number
}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => customersAPI.getCustomers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersAPI.getCustomer(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: customersAPI.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerData }) => 
      customersAPI.updateCustomer(id, data),
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.setQueryData(customerKeys.detail(updatedCustomer.id), updatedCustomer)
    },
  })
}