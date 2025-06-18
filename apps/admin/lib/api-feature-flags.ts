import axios from 'axios';
import { FeatureFlag, CreateFeatureFlagData, UpdateFeatureFlagData } from '../types/feature-flag';
import { handleApiError } from '../utils/errorHandling';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
  total: number;
  enabledCount: number;
  experimentalCount: number;
  categoryCount: number;
}

export async function getFeatureFlags(): Promise<FeatureFlagsResponse> {
  try {
    const { data } = await api.get<FeatureFlag[]>('/api/admin/feature-flags');
    
    // Calculate stats
    const enabledCount = data.filter(f => f.enabled).length;
    const experimentalCount = data.filter(f => f.category === 'Experimental').length;
    const categories = new Set(data.map(f => f.category)).size;

    return {
      flags: data,
      total: data.length,
      enabledCount,
      experimentalCount,
      categoryCount: categories
    };
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function createFeatureFlag(flagData: CreateFeatureFlagData): Promise<FeatureFlag> {
  try {
    const { data } = await api.post<FeatureFlag>('/api/admin/feature-flags', flagData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function updateFeatureFlag(id: string, flagData: UpdateFeatureFlagData): Promise<FeatureFlag> {
  try {
    const { data } = await api.put<FeatureFlag>(`/api/admin/feature-flags/${id}`, flagData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function deleteFeatureFlag(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/feature-flags/${id}`);
  } catch (error) {
    throw handleApiError(error);
  }
}

// Helper function to toggle a feature flag
export async function toggleFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
  try {
    const { data } = await api.patch<FeatureFlag>(`/api/admin/feature-flags/${id}/toggle`, { enabled });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Helper function to update rollout percentage
export async function updateRolloutPercentage(id: string, percentage: number): Promise<FeatureFlag> {
  try {
    const { data } = await api.patch<FeatureFlag>(`/api/admin/feature-flags/${id}/rollout`, { 
      rolloutPercentage: percentage 
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}