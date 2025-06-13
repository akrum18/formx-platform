import { RoutingStep, Routing, Process, CreateRoutingData } from "../types/routing"

import axios from "axios"

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
    return data
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
    return data
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
    const { data } = await api.post<Routing>("/api/admin/routings", routing)
    return data
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
    return data
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