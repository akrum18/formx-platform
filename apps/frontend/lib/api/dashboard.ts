import { useQuery } from '@tanstack/react-query'

// Types (matching the existing dashboard types)
export interface DashboardStats {
  activeRfqs: number
  rfqsThisMonth: number
  pendingQuotes: number
  quotesThisMonth: number
  activeOrders: number
  ordersThisMonth: number
  completedOrders: number
  completedThisMonth: number
}

export interface DashboardRFQ {
  id: string
  name: string
  date: string
  parts: number
  status: string
}

export interface DashboardQuote {
  id: string
  name: string
  date: string
  total: number
  status: string
}

export interface DashboardOrder {
  id: string
  name: string
  date: string
  total: number
  status: string
}

export interface DashboardData {
  stats: DashboardStats
  rfqs: DashboardRFQ[]
  quotes: DashboardQuote[]
  orders: DashboardOrder[]
}

// API client
class DashboardAPI {
  private baseUrl = '/api/v2/dashboard'

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    // Cookies are sent automatically with same-origin requests
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'same-origin', // Ensure cookies are sent with same-origin requests
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

  async getDashboardData(customerId: string): Promise<DashboardData> {
    const params = new URLSearchParams()
    params.append('customerId', customerId)
    return this.request<DashboardData>(`${this.baseUrl}?${params}`)
  }
}

const dashboardAPI = new DashboardAPI()

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  customer: (customerId: string) => [...dashboardKeys.all, customerId] as const,
}

// React Query hook
export function useDashboardData(customerId: string) {
  return useQuery({
    queryKey: dashboardKeys.customer(customerId),
    queryFn: () => dashboardAPI.getDashboardData(customerId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!customerId,
  })
}