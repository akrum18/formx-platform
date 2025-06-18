export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureFlagData {
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  category: string;
}

export interface UpdateFeatureFlagData {
  name?: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  category?: string;
}

export interface FeatureFlagStats {
  total: number;
  enabled: number;
  experimental: number;
  categories: number;
}