import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface OrderPart {
  id: string
  partId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: 'Pending' | 'In Production' | 'Completed' | 'Shipped'
  part: {
    id: string
    partName: string
    fileName: string
    process: {
      id: string
      name: string
      category: string
    }
  }
}

export interface Order {
  id: string
  orderNumber: string
  quoteId?: string
  customerId: string
  status: 'Pending' | 'In Production' | 'Shipped' | 'Completed' | 'Cancelled'
  subtotal: number
  tax: number
  shipping: number
  total: number
  orderDate: string
  estimatedShipDate?: string
  actualShipDate?: string
  trackingNumber?: string
  customerNotes?: string
  internalNotes?: any[]
  customer: {
    id: string
    name: string
    email: string
    company?: string
  }
  quote?: {
    id: string
    quoteNumber: string
    rfq?: {
      id: string
      rfqNumber: string
    }
  }
  parts: OrderPart[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderData {
  quoteId?: string
  customerId: string
  parts: Array<{
    partId: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  tax?: number
  shipping?: number
  total: number
  customerNotes?: string
}

export interface UpdateOrderData {
  status?: Order['status']
  estimatedShipDate?: string
  actualShipDate?: string
  trackingNumber?: string
  internalNotes?: any[]
}

// API client
class OrdersAPI {
  private baseUrl = '/api/v2/orders'

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

  async getOrders(filters?: { 
    customerId?: string
    status?: string
    limit?: number
  }): Promise<Order[]> {
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
    return this.request<Order[]>(url)
  }

  async getOrder(id: string): Promise<Order> {
    return this.request<Order>(`${this.baseUrl}/${id}`)
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    return this.request<Order>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOrder(id: string, data: UpdateOrderData): Promise<Order> {
    return this.request<Order>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

const ordersAPI = new OrdersAPI()

// Query keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters?: { customerId?: string; status?: string; limit?: number }) => 
    [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
}

// React Query hooks
export function useOrders(filters?: { 
  customerId?: string
  status?: string
  limit?: number
}) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => ordersAPI.getOrders(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersAPI.getOrder(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ordersAPI.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      // Also invalidate quote queries since order creation updates quote status
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderData }) => 
      ordersAPI.updateOrder(id, data),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      queryClient.setQueryData(orderKeys.detail(updatedOrder.id), updatedOrder)
    },
  })
}