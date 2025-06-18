import { RoutingStep, Routing, Process, CreateRoutingData } from "../types/routing"
import { snakeToCamel } from "./utils";

import axios from "axios"
// Utility: convert camelCase to snake_case recursively
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        toSnakeCase(v),
      ])
    );
  }
  return obj;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface RoutingFilters {
  search?: string
  category?: string
  active?: boolean
  sort?: string
  order?: "asc" | "desc"
}

export interface RoutingStats {
  totalRoutings: number
  activeRoutings: number
  averageSteps: number
}

export interface RoutingsResponse {
  routings: Routing[]
  total: number
  stats: RoutingStats
}

// Fetch all routings with optional filters
export async function getRoutings(filters?: RoutingFilters): Promise<RoutingsResponse> {
  const params = new URLSearchParams()
  if (filters?.search) params.append("search", filters.search)
  if (filters?.category) params.append("category", filters.category)
  if (filters?.active !== undefined) params.append("active", filters.active.toString())
  if (filters?.sort) params.append("sort", filters.sort)
  if (filters?.order) params.append("order", filters.order)

  try {
    const { data } = await api.get<RoutingsResponse>(`/api/admin/routings?${params.toString()}`)
    // Normalize all keys to camelCase recursively
const normalizedData = snakeToCamel(data); // This will be the camelCase array
    return {
      routings: normalizedData,
      total: normalizedData.length,
      stats: {
        totalRoutings: normalizedData.length,
        activeRoutings: normalizedData.filter((r: any) => r.active).length,
        averageSteps: normalizedData.length > 0 ? (normalizedData.reduce((sum: number, r: any) => sum + r.steps.length, 0) / normalizedData.length) : 0,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to fetch routings")
  }
}
  

// Fetch a single routing by ID
export async function getRouting(id: string): Promise<Routing> {
  try {
    const { data } = await api.get<Routing>(`/api/admin/routings/${id}`)
    return snakeToCamel(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to fetch routing")
  }
}

// Create a new routing
export async function createRouting(routing: CreateRoutingData): Promise<Routing> {
  try {
    // Clean up the routing data to match backend expectations
    const cleanedRouting = {
      name: routing.name,
      description: routing.description || "",
      category: routing.category || "",
      category_id: (routing as any).categoryId || null, // Get categoryId from the extended routing data
      total_setup_time: routing.totalSetupTime || 0,
      estimated_lead_time: routing.estimatedLeadTime,
      active: routing.active,
      material_markup: routing.materialMarkup,
      finishing_cost: routing.finishingCost,
      is_primary_pricing_route: routing.isPrimaryPricingRoute || false,
      complexity_score: 1, // Default complexity score
      steps: routing.steps.map(step => ({
        process_id: step.processId,
        sequence: step.sequence,
        setup_time_multiplier: step.setupTimeMultiplier,
        runtime_multiplier: step.runtimeMultiplier,
        notes: step.notes || "",
        parallel_step: false,
        quality_check_required: false
        // Remove frontend-only fields
        // id, processName, setupTime, hourlyRate, minimumCost, complexityMultiplier
      }))
    };
    
    const { data } = await api.post<Routing>("/api/admin/routings", cleanedRouting)
    return snakeToCamel(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to create routing")
  }
}

// Update an existing routing
export async function updateRouting(id: string, routing: Partial<Routing>): Promise<Routing> {
  try {
    const { data } = await api.put<Routing>(`/api/admin/routings/${id}`, routing)
    return snakeToCamel(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to update routing")
  }
}

// Delete a routing
export async function deleteRouting(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/routings/${id}`)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to delete routing")
  }
}

// Set a routing as the primary pricing route
export async function setPrimaryRoute(id: string): Promise<Routing> {
  try {
    const { data } = await api.post<Routing>(`/api/admin/routings/${id}/set-primary`)
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to set primary route")
  }
}

// Fetch all available manufacturing processes
export async function getProcesses(): Promise<Process[]> {
  try {
    const { data } = await api.get<Process[]>("/api/admin/processes")
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to fetch processes")
  }
}