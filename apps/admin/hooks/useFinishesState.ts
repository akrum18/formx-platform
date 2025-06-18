import { useState, useCallback, useMemo } from 'react';
import { Finish, CreateFinishData, UpdateFinishData } from '../types/finish';
import { getFinishes, createFinish, updateFinish, deleteFinish } from '../lib/api-finishes';
import { handleApiError } from '../utils/errorHandling';
import { validateFinishForm, formatCostPerSqIn, formatLeadTimeDays } from '../utils/finishValidation';

interface FinishesState {
  items: Finish[];
  ui: {
    isDialogOpen: boolean;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
  };
  form: {
    data: {
      name: string;
      type: string;
      costPerSqIn: string;
      leadTimeDays: string;
      description: string;
      active: boolean;
    };
    errors: Record<string, string>;
    editingId: string | null;
  };
  filters: {
    searchTerm: string;
    groupBy: string;
    sortConfig: {
      key: string;
      direction: 'asc' | 'desc';
    };
  };
}

const initialState: FinishesState = {
  items: [],
  ui: {
    isDialogOpen: false,
    isLoading: false,
    isSubmitting: false,
    error: null
  },
  form: {
    data: {
      name: '',
      type: 'Anodizing',
      costPerSqIn: '',
      leadTimeDays: '',
      description: '',
      active: true
    },
    errors: {},
    editingId: null
  },
  filters: {
    searchTerm: '',
    groupBy: '',
    sortConfig: {
      key: 'name',
      direction: 'asc'
    }
  }
};

export function useFinishesState() {
  const [state, setState] = useState<FinishesState>(initialState);

  // Computed values
  const stats = useMemo(() => ({
    total: state.items.length,
    active: state.items.filter(f => f.active).length,
    types: new Set(state.items.map(f => f.type)).size,
    avgLeadTime: state.items.length > 0 
      ? Math.round(state.items.reduce((sum, f) => sum + f.leadTimeDays, 0) / state.items.length)
      : 0
  }), [state.items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return state.items.filter(finish => 
      finish.name.toLowerCase().includes(state.filters.searchTerm.toLowerCase()) ||
      finish.type.toLowerCase().includes(state.filters.searchTerm.toLowerCase()) ||
      finish.description.toLowerCase().includes(state.filters.searchTerm.toLowerCase())
    );
  }, [state.items, state.filters.searchTerm]);

  // Data fetching
  const fetchFinishes = useCallback(async () => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isLoading: true, error: null }}));
    try {
      const response = await getFinishes();
      setState(prev => ({ 
        ...prev, 
        items: response.finishes,
        ui: { ...prev.ui, isLoading: false }
      }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      setState(prev => ({ 
        ...prev, 
        ui: { ...prev.ui, isLoading: false, error: errorMessage }
      }));
    }
  }, []);

  // Form handling
  const openDialog = useCallback((finish?: Finish) => {
    setState(prev => ({
      ...prev,
      ui: { 
        ...prev.ui, 
        isDialogOpen: true, 
        isSubmitting: false, // Reset submission state
        error: null 
      },
      form: {
        data: finish ? {
          name: finish.name,
          type: finish.type,
          costPerSqIn: finish.costPerSqIn.toString(),
          leadTimeDays: finish.leadTimeDays.toString(),
          description: finish.description,
          active: finish.active
        } : initialState.form.data,
        errors: {},
        editingId: finish?.id || null
      }
    }));
  }, []);

  const closeDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      ui: { 
        ...prev.ui, 
        isDialogOpen: false,
        isSubmitting: false, // Reset submission state
        error: null
      },
      form: { ...initialState.form }
    }));
  }, []);

  const updateFormField = useCallback((field: keyof FinishesState['form']['data'], value: string | boolean) => {
    setState(prev => ({
      ...prev,
      form: {
        ...prev.form,
        data: {
          ...prev.form.data,
          [field]: field === 'costPerSqIn' 
            ? formatCostPerSqIn(value as string)
            : field === 'leadTimeDays'
            ? formatLeadTimeDays(value as string)
            : value
        },
        errors: {
          ...prev.form.errors,
          [field]: '' // Clear error when field is updated
        }
      }
    }));
  }, []);

  const submitForm = useCallback(async () => {
    const errors = validateFinishForm(state.form.data);
    if (Object.keys(errors).length > 0) {
      setState(prev => ({
        ...prev,
        form: { ...prev.form, errors }
      }));
      return;
    }

    setState(prev => ({ ...prev, ui: { ...prev.ui, isSubmitting: true, error: null }}));
    try {
      const finishData = {
        name: state.form.data.name,
        type: state.form.data.type,
        costPerSqIn: parseFloat(state.form.data.costPerSqIn),
        leadTimeDays: parseInt(state.form.data.leadTimeDays),
        description: state.form.data.description,
        active: state.form.data.active
      };

      if (state.form.editingId) {
        await updateFinish(state.form.editingId, finishData);
      } else {
        await createFinish(finishData);
      }

      await fetchFinishes();
      closeDialog(); // This will also reset isSubmitting
    } catch (error) {
      const errorMessage = handleApiError(error);
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, isSubmitting: false, error: errorMessage }
      }));
    }
  }, [state.form.data, state.form.editingId, closeDialog, fetchFinishes]);

  // Batch import handling
  const importFinishes = useCallback(async (finishes: CreateFinishData[]) => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isSubmitting: true, error: null }}));
    try {
      for (const finishData of finishes) {
        await createFinish(finishData);
      }
      await fetchFinishes();
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, isSubmitting: false, error: null }
      }));
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, isSubmitting: false, error: errorMessage }
      }));
      return false;
    }
  }, [fetchFinishes]);

  // Delete handling
  const deleteFinishItem = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, isSubmitting: true, error: null }}));
    try {
      await deleteFinish(id);
      await fetchFinishes();
      setState(prev => ({ 
        ...prev, 
        ui: { ...prev.ui, isSubmitting: false, error: null }
      }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, isSubmitting: false, error: errorMessage }
      }));
    }
  }, [fetchFinishes]);

  // Filter and sort handling
  const updateSearchTerm = useCallback((term: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, searchTerm: term }
    }));
  }, []);

  const updateGroupBy = useCallback((groupBy: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, groupBy }
    }));
  }, []);

  const updateSort = useCallback((key: string) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        sortConfig: {
          key,
          direction: prev.filters.sortConfig.key === key && 
                     prev.filters.sortConfig.direction === 'asc' ? 'desc' : 'asc'
        }
      }
    }));
  }, []);

  return {
    // State
    items: filteredItems,
    ui: state.ui,
    form: state.form,
    filters: state.filters,
    stats,

    // Actions
    actions: {
      fetchFinishes,
      openDialog,
      closeDialog,
      updateFormField,
      submitForm,
      importFinishes,
      deleteFinishItem,
      updateSearchTerm,
      updateGroupBy,
      updateSort
    }
  };
}