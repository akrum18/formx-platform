import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, string>;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as ApiErrorResponse | undefined;

    switch (status) {
      case 400:
        return data?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data?.message || 'This operation conflicts with existing data.';
      case 422:
        if (data?.details) {
          return Object.entries(data.details)
            .map(([field, error]) => `${field}: ${error}`)
            .join(', ');
        }
        return data?.message || 'Validation error. Please check your input.';
      case 500:
        return 'An unexpected error occurred. Please try again later.';
      default:
        return data?.message || 'An error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof AxiosError && !error.response;
}

export function shouldRetryRequest(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    return !status || status >= 500 || status === 429;
  }
  return false;
}