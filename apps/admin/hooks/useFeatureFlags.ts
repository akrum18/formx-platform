import { useState, useCallback, useMemo } from 'react';
import { FeatureFlag, CreateFeatureFlagData, UpdateFeatureFlagData } from '../types/feature-flag';
import {
  getFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlag,
  updateRolloutPercentage,
  type FeatureFlagsResponse
} from '../lib/api-feature-flags';
import { toast } from '@/components/ui/use-toast';

interface FeatureFlagsState {
  items: FeatureFlag[];
  ui: {
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
  };
  filters: {
    searchTerm: string;
    category: string | null;
  };
  stats: {
    total: number;
    enabled: number;
    experimental: number;
    categories: number;
  };
}

const initialState: FeatureFlagsState = {
  items: [],
  ui: {
    isLoading: false,
    isSubmitting: false,
    error: null
  },
  filters: {
    searchTerm: '',
    category: null
  },
  stats: {
    total: 0,
    enabled: 0,
    experimental: 0,
    categories: 0
  }
};

export function useFeatureFlags() {
  const [state, setState] = useState<FeatureFlagsState>(initialState);

  // Fetch feature flags
  const fetchFlags = useCallback(async () => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isLoading: true, error: null }}));
    try {
      const response = await getFeatureFlags();
      setState(prev => ({
        ...prev,
        items: response.flags,
        stats: {
          total: response.total,
          enabled: response.enabledCount,
          experimental: response.experimentalCount,
          categories: response.categoryCount
        },
        ui: { ...prev.ui, isLoading: false }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        ui: { 
          ...prev.ui, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch feature flags' 
        }
      }));
      toast({
        title: "Error",
        description: "Failed to fetch feature flags",
        variant: "destructive"
      });
    }
  }, []);

  // Create new feature flag
  const createFlag = useCallback(async (data: CreateFeatureFlagData) => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isSubmitting: true, error: null }}));
    try {
      await createFeatureFlag(data);
      await fetchFlags(); // Refresh the list
      toast({
        title: "Success",
        description: "Feature flag created successfully",
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        ui: { 
          ...prev.ui, 
          isSubmitting: false, 
          error: error instanceof Error ? error.message : 'Failed to create feature flag' 
        }
      }));
      toast({
        title: "Error",
        description: "Failed to create feature flag",
        variant: "destructive"
      });
    }
  }, [fetchFlags]);

  // Update feature flag
  const updateFlag = useCallback(async (id: string, data: UpdateFeatureFlagData) => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isSubmitting: true, error: null }}));
    try {
      await updateFeatureFlag(id, data);
      await fetchFlags(); // Refresh the list
      toast({
        title: "Success",
        description: "Feature flag updated successfully",
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        ui: { 
          ...prev.ui, 
          isSubmitting: false, 
          error: error instanceof Error ? error.message : 'Failed to update feature flag' 
        }
      }));
      toast({
        title: "Error",
        description: "Failed to update feature flag",
        variant: "destructive"
      });
    }
  }, [fetchFlags]);

  // Toggle feature flag
  const toggleFlag = useCallback(async (id: string, enabled: boolean) => {
    // Optimistically update the UI
    setState(prev => ({
      ...prev,
      items: prev.items.map(flag => 
        flag.id === id ? { ...flag, enabled } : flag
      )
    }));

    try {
      await toggleFeatureFlag(id, enabled);
      await fetchFlags(); // Refresh to ensure consistency
    } catch (error) {
      // Revert the optimistic update
      setState(prev => ({
        ...prev,
        items: prev.items.map(flag => 
          flag.id === id ? { ...flag, enabled: !enabled } : flag
        ),
        ui: { 
          ...prev.ui,
          error: error instanceof Error ? error.message : 'Failed to toggle feature flag' 
        }
      }));
      toast({
        title: "Error",
        description: "Failed to toggle feature flag",
        variant: "destructive"
      });
    }
  }, [fetchFlags]);

  // Update rollout percentage
  const updateRollout = useCallback(async (id: string, percentage: number) => {
    // Optimistically update the UI
    setState(prev => ({
      ...prev,
      items: prev.items.map(flag => 
        flag.id === id ? { ...flag, rolloutPercentage: percentage } : flag
      )
    }));

    try {
      await updateRolloutPercentage(id, percentage);
      await fetchFlags(); // Refresh to ensure consistency
    } catch (error) {
      // Revert the optimistic update
      setState(prev => ({
        ...prev,
        items: prev.items.map(flag => 
          flag.id === id ? { ...flag, rolloutPercentage: prev.items.find(f => f.id === id)?.rolloutPercentage || 0 } : flag
        ),
        ui: { 
          ...prev.ui,
          error: error instanceof Error ? error.message : 'Failed to update rollout percentage' 
        }
      }));
      toast({
        title: "Error",
        description: "Failed to update rollout percentage",
        variant: "destructive"
      });
    }
  }, [fetchFlags]);

  // Delete feature flag
  const deleteFlag = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isSubmitting: true, error: null }}));
    try {
      await deleteFeatureFlag(id);
      await fetchFlags(); // Refresh the list
      toast({
        title: "Success",
        description: "Feature flag deleted successfully",
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        ui: { 
          ...prev.ui, 
          isSubmitting: false, 
          error: error instanceof Error ? error.message : 'Failed to delete feature flag' 
        }
      }));
      toast({
        title: "Error",
        description: "Failed to delete feature flag",
        variant: "destructive"
      });
    }
  }, [fetchFlags]);

  // Filter handling
  const updateSearchTerm = useCallback((term: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, searchTerm: term }
    }));
  }, []);

  const updateCategory = useCallback((category: string | null) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, category }
    }));
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return state.items.filter(flag => {
      const matchesSearch = 
        flag.name.toLowerCase().includes(state.filters.searchTerm.toLowerCase()) ||
        flag.description?.toLowerCase().includes(state.filters.searchTerm.toLowerCase()) ||
        flag.category.toLowerCase().includes(state.filters.searchTerm.toLowerCase());

      const matchesCategory = !state.filters.category || flag.category === state.filters.category;

      return matchesSearch && matchesCategory;
    });
  }, [state.items, state.filters.searchTerm, state.filters.category]);

  return {
    // State
    items: filteredItems,
    ui: state.ui,
    filters: state.filters,
    stats: state.stats,

    // Actions
    actions: {
      fetchFlags,
      createFlag,
      updateFlag,
      deleteFlag,
      toggleFlag,
      updateRollout,
      updateSearchTerm,
      updateCategory
    }
  };
}