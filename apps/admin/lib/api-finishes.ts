import axios from "axios"
import { snakeToCamel } from "./utils";
import { Finish, CreateFinishData, UpdateFinishData } from "../types/finish"

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

export interface FinishesResponse {
  finishes: Finish[]
  total: number
  activeFinishes: number
  finishTypes: number
  avgLeadTime: number
}

export async function getFinishes(): Promise<FinishesResponse> {
  try {
    const { data } = await api.get<Finish[]>("/api/admin/finishes")
    const normalizedData = snakeToCamel(data); // This will be the camelCase array
    
    const totalFinishes = normalizedData.length;
    const activeFinishes = normalizedData.filter((f: any) => f.active).length;
    const finishTypes = [...new Set(normalizedData.map((f: any) => f.type))].length;
    const avgLeadTime = totalFinishes > 0 ? normalizedData.reduce((sum: number, f: any) => sum + f.leadTimeDays, 0) / totalFinishes : 0;

    return {
      finishes: normalizedData,
      total: totalFinishes,
      activeFinishes: activeFinishes,
      finishTypes: finishTypes,
      avgLeadTime: avgLeadTime,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to fetch finishes")
  }
}

export async function createFinish(finishData: CreateFinishData): Promise<Finish> {
  try {
    const { data } = await api.post<Finish>("/api/admin/finishes", toSnakeCase(finishData))
    return snakeToCamel(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to create finish")
  }
}

export async function updateFinish(id: string, finishData: UpdateFinishData): Promise<Finish> {
  try {
    const { data } = await api.put<Finish>(`/api/admin/finishes/${id}`, toSnakeCase(finishData))
    return snakeToCamel(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to update finish")
  }
}

export async function deleteFinish(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/finishes/${id}`)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error("Failed to delete finish")
  }
}

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