interface FinishFormData {
  name: string;
  type: string;
  costPerSqIn: string;
  leadTimeDays: string;
  description: string;
  active: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const FINISH_TYPES = ['Anodizing', 'Powder Coating', 'Plating', 'Chemical', 'Paint'];

export function validateFinishForm(data: FinishFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  } else if (!/^[a-zA-Z0-9\s-]+$/.test(data.name)) {
    errors.name = 'Name can only contain letters, numbers, spaces, and hyphens';
  }

  // Type validation
  if (!FINISH_TYPES.includes(data.type)) {
    errors.type = 'Invalid finish type';
  }

  // Cost validation
  const cost = parseFloat(data.costPerSqIn);
  if (isNaN(cost)) {
    errors.costPerSqIn = 'Cost must be a valid number';
  } else if (cost <= 0) {
    errors.costPerSqIn = 'Cost must be greater than 0';
  } else if (cost > 1000) {
    errors.costPerSqIn = 'Cost seems unusually high. Please verify';
  }

  // Lead time validation
  const leadTime = parseInt(data.leadTimeDays);
  if (isNaN(leadTime)) {
    errors.leadTimeDays = 'Lead time must be a valid number';
  } else if (leadTime < 0) {
    errors.leadTimeDays = 'Lead time cannot be negative';
  } else if (leadTime > 365) {
    errors.leadTimeDays = 'Lead time cannot exceed 365 days';
  }

  // Description validation (optional field)
  if (data.description && data.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  return errors;
}

export function formatCostPerSqIn(value: string): string {
  const number = parseFloat(value);
  if (isNaN(number)) return '';
  return number.toFixed(3);
}

export function formatLeadTimeDays(value: string): string {
  const number = parseInt(value);
  if (isNaN(number)) return '';
  return Math.max(0, number).toString();
}

export const VALID_FINISH_TYPES = FINISH_TYPES;