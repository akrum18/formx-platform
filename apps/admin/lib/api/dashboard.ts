import { useQuery } from '@tanstack/react-query'

export interface DashboardStats {
  materials: {
    total: number
    recent: number
    lastUpdate: string
  }
  processes: {
    total: number
    recent: number
    lastUpdate: string
  }
  routings: {
    total: number
    recent: number
    lastUpdate: string
  }
  finishes: {
    total: number
    recent: number
    lastUpdate: string
  }
  featureFlags: {
    total: number
    enabled: number
    experimental: number
  }
  versions: {
    current: string
    status: string
    drafts: number
    publishedAt: string | null
  }
}

export interface DashboardSection {
  title: string
  count: string
  status: string
  lastUpdate: string
}

export interface DashboardActivity {
  totalItems: number
  recentActivity: number
  systemHealth: string
}

export interface DashboardData {
  stats: DashboardStats
  sections: DashboardSection[]
  activity: DashboardActivity
  generatedAt: string
}

class DashboardAPI {
  private baseUrl = '/api/v2/dashboard'

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

  async getDashboardData(): Promise<DashboardData> {
    return this.request<DashboardData>(this.baseUrl)
  }
}

const dashboardAPI = new DashboardAPI()

export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
}

export function useDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: () => dashboardAPI.getDashboardData(),
    staleTime: 2 * 60 * 1000, // 2 minutes (dashboard data should be relatively fresh)
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  })
}