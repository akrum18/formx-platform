import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface VolumeBreak {
  id: string
  minQuantity: number
  maxQuantity: number | null
  discountPercent: number
}

export interface TierMultiplier {
  economy: number
  standard: number
  rush: number
}

export interface TierOverride {
  multiplier?: number
  materialMarkupOverride?: number
  finishingCostOverride?: number
  leadTimeOverride?: number
}

export interface RoutingPricing {
  routingId: string
  routingName: string
  category: string
  baseCost: number
  materialMarkup: number
  finishingCost: number
  leadTime: number
  tierOverrides: {
    economy?: TierOverride
    standard?: TierOverride
    rush?: TierOverride
  }
}

export interface PricingConfiguration {
  id?: string
  routings: RoutingPricing[]
  globalSettings: {
    defaultTierMultipliers: TierMultiplier
    volumeBreaks: VolumeBreak[]
    minimumOrderValue: number
  }
  version?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface UpdateRoutingPricingData {
  baseCost?: number
  materialMarkup?: number
  finishingCost?: number
  leadTime?: number
  tierOverrides?: {
    economy?: TierOverride
    standard?: TierOverride
    rush?: TierOverride
  }
}

// API client
class PricingConfigAPI {
  private baseUrl = '/api/v2/pricing-config'

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

  async getPricingConfig(): Promise<PricingConfiguration> {
    return this.request<PricingConfiguration>(this.baseUrl)
  }

  async updatePricingConfig(data: Partial<PricingConfiguration>): Promise<PricingConfiguration> {
    return this.request<PricingConfiguration>(this.baseUrl, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getRoutingPricing(routingId: string): Promise<RoutingPricing> {
    return this.request<RoutingPricing>(`${this.baseUrl}/${routingId}`)
  }

  async updateRoutingPricing(routingId: string, data: UpdateRoutingPricingData): Promise<RoutingPricing> {
    return this.request<RoutingPricing>(`${this.baseUrl}/${routingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

const pricingConfigAPI = new PricingConfigAPI()

// Query keys
export const pricingConfigKeys = {
  all: ['pricing-config'] as const,
  config: () => [...pricingConfigKeys.all, 'config'] as const,
  routings: () => [...pricingConfigKeys.all, 'routings'] as const,
  routing: (id: string) => [...pricingConfigKeys.routings(), id] as const,
}

// React Query hooks
export function usePricingConfig() {
  return useQuery({
    queryKey: pricingConfigKeys.config(),
    queryFn: () => pricingConfigAPI.getPricingConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useRoutingPricing(routingId: string) {
  return useQuery({
    queryKey: pricingConfigKeys.routing(routingId),
    queryFn: () => pricingConfigAPI.getRoutingPricing(routingId),
    enabled: !!routingId,
  })
}

export function useUpdatePricingConfig() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PricingConfiguration) => pricingConfigAPI.updatePricingConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingConfigKeys.config() })
      queryClient.invalidateQueries({ queryKey: pricingConfigKeys.routings() })
    },
  })
}

export function useUpdateRoutingPricing() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ routingId, data }: { routingId: string; data: UpdateRoutingPricingData }) =>
      pricingConfigAPI.updateRoutingPricing(routingId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: pricingConfigKeys.config() })
      queryClient.invalidateQueries({ queryKey: pricingConfigKeys.routing(variables.routingId) })
    },
  })
}

// Utility functions for pricing calculations
export function calculatePrice(
  routing: RoutingPricing,
  tier: 'economy' | 'standard' | 'rush',
  defaultTierMultipliers: TierMultiplier,
  volumeBreaks: VolumeBreak[],
  quantity = 1
) {
  const tierOverride = routing.tierOverrides[tier]
  const defaultMultiplier = defaultTierMultipliers[tier]

  // Get effective values
  const multiplier = tierOverride?.multiplier ?? defaultMultiplier
  const materialMarkup = tierOverride?.materialMarkupOverride ?? routing.materialMarkup
  const finishingCost = tierOverride?.finishingCostOverride ?? routing.finishingCost

  // Calculate costs
  const processingCost = routing.baseCost * multiplier
  const materialCost = 100 * (1 + materialMarkup / 100) // Assuming $100 material
  const finishingCostTotal = finishingCost * 100 // Assuming 100 sq in

  // Apply volume discounts
  const applicableBreak = volumeBreaks.find(
    (vb) => quantity >= vb.minQuantity && (vb.maxQuantity === null || quantity <= vb.maxQuantity)
  )
  const discount = applicableBreak?.discountPercent || 0

  const subtotal = processingCost + materialCost + finishingCostTotal
  const finalPrice = subtotal * (1 - discount / 100)

  return {
    processingCost,
    materialCost,
    finishingCost: finishingCostTotal,
    subtotal,
    discount,
    finalPrice,
    effectiveMultiplier: multiplier,
    effectiveMaterialMarkup: materialMarkup,
    effectiveFinishingCost: finishingCost,
  }
}

// Helper functions
export function getTierColor(tier: string) {
  switch (tier) {
    case "economy":
      return "text-green-600 bg-green-50 border-green-200"
    case "standard":
      return "text-blue-600 bg-blue-50 border-blue-200"
    case "rush":
      return "text-red-600 bg-red-50 border-red-200"
    default:
      return "text-slate-600 bg-slate-50 border-slate-200"
  }
}

export function getProcessesInRouting(routingName: string): string[] {
  return routingName.split(" - ").map((name) => name.trim())
}