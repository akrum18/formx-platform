export interface RoutingStep {
  id: string
  processId: string
  processName: string
  sequence: number
  setupTimeMultiplier: number
  runtimeMultiplier: number
  notes?: string
  // Process data
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
  defaultMaterialCost: number // New: Default material cost for this routing
  defaultSurfaceArea: number // New: Default surface area for finishing costs
  defaultRuntimeMinutes: number // New: Default runtime per step for calculations
}

// Helper type for creating new routings
export type CreateRoutingData = Omit<Routing, "id" | "createdAt" | "updatedAt">

// Helper function to validate and convert partial routing data
export function validateRoutingData(data: Partial<Routing>): CreateRoutingData {
  // Validate required fields
  if (!data.name) {
    throw new Error("Routing name is required")
  }
  if (!data.description) {
    throw new Error("Routing description is required")
  }
  if (!data.category) {
    throw new Error("Routing category is required")
  }

  return {
    name: data.name,
    description: data.description,
    category: data.category,
    steps: data.steps || [],
    totalSetupTime: data.totalSetupTime || 0,
    estimatedLeadTime: data.estimatedLeadTime || 0,
    active: data.active ?? true,
    materialMarkup: data.materialMarkup || 0,
    finishingCost: data.finishingCost || 0,
    isPrimaryPricingRoute: data.isPrimaryPricingRoute || false,
    defaultMaterialCost: data.defaultMaterialCost || 0,
    defaultSurfaceArea: data.defaultSurfaceArea || 0,
    defaultRuntimeMinutes: data.defaultRuntimeMinutes || 0,
  }
}
export interface Process {
  id: string
  name: string
  category: string
  setupTime: number
  hourlyRate: number
  minimumCost: number
  complexityMultiplier: number
  description?: string
}