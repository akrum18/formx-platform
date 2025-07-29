import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface RoutingStep {
  id: string
  processId: string
  processName: string
  sequence: number
  setupTimeMultiplier: number
  runtimeMultiplier: number
  notes?: string
  // Pricing data from process
  setupTime: number // minutes
  hourlyRate: number // $/hour
  minimumCost: number // $
  complexityMultiplier: number
}

export interface Routing {
  id: string
  name: string
  description: string
  category: string
  steps: RoutingStep[]
  totalSetupTime: number
  estimatedLeadTime: number
  active: boolean
  createdAt: string
  updatedAt: string
  // Pricing configuration
  materialMarkup: number // %
  finishingCost: number // $ per sq in
  isPrimaryPricingRoute: boolean
}

export interface CreateRoutingData {
  name: string
  description: string
  category: string
  steps: Array<{
    processId: string
    sequence: number
    setupTimeMultiplier: number
    runtimeMultiplier: number
    notes?: string
  }>
  estimatedLeadTime: number
  materialMarkup: number
  finishingCost: number
  active?: boolean
}

export interface UpdateRoutingData {
  name?: string
  description?: string
  category?: string
  steps?: Array<{
    processId: string
    sequence: number
    setupTimeMultiplier: number
    runtimeMultiplier: number
    notes?: string
  }>
  estimatedLeadTime?: number
  materialMarkup?: number
  finishingCost?: number
  active?: boolean
  isPrimaryPricingRoute?: boolean
}

// API client
class RoutingsAPI {
  private baseUrl = '/api/v2/routings'

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

  async getRoutings(filters?: { 
    active?: boolean; 
    category?: string 
  }): Promise<Routing[]> {
    const params = new URLSearchParams()
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }
    if (filters?.category) {
      params.append('category', filters.category)
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Routing[]>(url)
  }

  async getRouting(id: string): Promise<Routing> {
    return this.request<Routing>(`${this.baseUrl}/${id}`)
  }

  async createRouting(data: CreateRoutingData): Promise<Routing> {
    return this.request<Routing>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRouting(id: string, data: UpdateRoutingData): Promise<Routing> {
    return this.request<Routing>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRouting(id: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
  }

  async duplicateRouting(id: string): Promise<Routing> {
    // Get the original routing first
    const original = await this.getRouting(id)
    
    // Create a duplicate with modified name
    const duplicateData: CreateRoutingData = {
      name: `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      steps: original.steps.map(step => ({
        processId: step.processId,
        sequence: step.sequence,
        setupTimeMultiplier: step.setupTimeMultiplier,
        runtimeMultiplier: step.runtimeMultiplier,
        notes: step.notes
      })),
      estimatedLeadTime: original.estimatedLeadTime,
      materialMarkup: original.materialMarkup,
      finishingCost: original.finishingCost,
      active: original.active
    }

    return this.createRouting(duplicateData)
  }
}

const routingsAPI = new RoutingsAPI()

// Query keys
export const routingsKeys = {
  all: ['routings'] as const,
  lists: () => [...routingsKeys.all, 'list'] as const,
  list: (filters?: { active?: boolean; category?: string }) => 
    [...routingsKeys.lists(), filters] as const,
  details: () => [...routingsKeys.all, 'detail'] as const,
  detail: (id: string) => [...routingsKeys.details(), id] as const,
}

// React Query hooks
export function useRoutings(filters?: { active?: boolean; category?: string }) {
  return useQuery({
    queryKey: routingsKeys.list(filters),
    queryFn: () => routingsAPI.getRoutings(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useRouting(id: string) {
  return useQuery({
    queryKey: routingsKeys.detail(id),
    queryFn: () => routingsAPI.getRouting(id),
    enabled: !!id,
  })
}

export function useCreateRouting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateRoutingData) => routingsAPI.createRouting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingsKeys.lists() })
    },
  })
}

export function useUpdateRouting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoutingData }) =>
      routingsAPI.updateRouting(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: routingsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: routingsKeys.detail(variables.id) })
    },
  })
}

export function useDeleteRouting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => routingsAPI.deleteRouting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingsKeys.lists() })
    },
  })
}

export function useDuplicateRouting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => routingsAPI.duplicateRouting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingsKeys.lists() })
    },
  })
}

// Toggle routing active status
export function useToggleRoutingActive() {
  const updateRouting = useUpdateRouting()
  
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateRouting.mutateAsync({ id, data: { active } }),
  })
}

// Set primary pricing route
export function useSetPrimaryRoute() {
  const updateRouting = useUpdateRouting()
  
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      updateRouting.mutateAsync({ id, data: { isPrimaryPricingRoute: true } }),
    onSuccess: () => {
      // Invalidate all routings to update the primary route status
      // In a real implementation, you'd also update other routes to set isPrimaryPricingRoute: false
    },
  })
}

// Bulk operations
export function useBulkUpdateRoutings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: UpdateRoutingData }>) => {
      const results = await Promise.all(
        updates.map(({ id, data }) => routingsAPI.updateRouting(id, data))
      )
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingsKeys.lists() })
    },
  })
}

// Helper hook for getting routings by category
export function useRoutingsByCategory(category: string) {
  return useRoutings({ 
    category,
    active: true 
  })
}

// Utility functions for routing calculations
export function calculateRoutingCost(routing: Routing, quantity = 1, materialCost = 100) {
  let totalSetupCost = 0
  let totalRuntimeCost = 0
  let totalMinimumCost = 0

  routing.steps.forEach((step) => {
    const setupCost = ((step.setupTime * step.setupTimeMultiplier) / 60) * step.hourlyRate
    const runtimeCost = ((30 * step.runtimeMultiplier) / 60) * step.hourlyRate * step.complexityMultiplier // Assuming 30 min runtime

    totalSetupCost += setupCost
    totalRuntimeCost += runtimeCost * quantity
    totalMinimumCost = Math.max(totalMinimumCost, step.minimumCost)
  })

  const processingCost = Math.max(totalSetupCost + totalRuntimeCost, totalMinimumCost)
  const materialCostWithMarkup = materialCost * (1 + routing.materialMarkup / 100)
  const finishingCost = routing.finishingCost * 100 // Assuming 100 sq in surface area

  return {
    processingCost,
    materialCost: materialCostWithMarkup,
    finishingCost,
    totalCost: processingCost + materialCostWithMarkup + finishingCost,
  }
}