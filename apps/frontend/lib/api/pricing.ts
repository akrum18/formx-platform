import { useQuery, useMutation } from '@tanstack/react-query'

// Types
export interface PricingCalculationRequest {
  parts: Array<{
    quantity: number
    routingId: string
    materialId: string
    finishId?: string | null
  }>
  tier: 'economy' | 'standard' | 'rush'
}

export interface PricingCalculationResult {
  subtotal: number
  discounts: number
  total: number
  tier: string
  breakdown: Array<{
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
  }>
}

// API client
class PricingAPI {
  private baseUrl = '/api/v2/pricing'

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

  async calculatePrice(data: PricingCalculationRequest): Promise<PricingCalculationResult> {
    return this.request<PricingCalculationResult>(`${this.baseUrl}/calculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

const pricingAPI = new PricingAPI()

// Query keys
export const pricingKeys = {
  all: ['pricing'] as const,
  calculations: () => [...pricingKeys.all, 'calculation'] as const,
  calculation: (data: PricingCalculationRequest) => 
    [...pricingKeys.calculations(), data] as const,
}

// React Query hooks
export function useQuoteCalculation() {
  return useMutation({
    mutationFn: pricingAPI.calculatePrice,
    // Don't cache pricing calculations as they may change frequently
    gcTime: 0,
  })
}

// Hook for getting real-time pricing (if needed)
export function usePriceCalculation(
  data: PricingCalculationRequest,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: pricingKeys.calculation(data),
    queryFn: () => pricingAPI.calculatePrice(data),
    enabled: options?.enabled && data.parts.length > 0,
    staleTime: 30 * 1000, // 30 seconds - pricing may change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}