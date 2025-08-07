import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
export interface CartItem {
  id: string
  cartId: string
  partId: string
  quantity: number
  tolerance: string
  leadTime: string
  notes?: string
  createdAt: string
  updatedAt: string
  part: {
    id: string
    partName: string
    fileName: string
    fileSize: number
    fileType: string
    fileUrl?: string
    process: {
      id: string
      name: string
      category: string
    }
    material: {
      id: string
      name: string
    }
    finish?: {
      id: string
      name: string
      type: string
    }
  }
}

export interface Cart {
  id: string
  userId: string
  customerId?: string
  sessionId?: string
  active: boolean
  createdAt: string
  updatedAt: string
  items: CartItem[]
}

export interface AddToCartData {
  partId: string
  quantity: number
  tolerance?: string
  leadTime?: string
  notes?: string
}

export interface UpdateCartItemData {
  quantity?: number
  tolerance?: string
  leadTime?: string
  notes?: string
}

export interface SubmitRFQData {
  customerNotes?: string
  customerInfo?: {
    name: string
    email: string
    phone?: string
    company?: string
  }
}

// API client
class CartAPI {
  private baseUrl = '/api/v2/cart'

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken')
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        code: 'UNKNOWN_ERROR', 
        message: 'An unknown error occurred' 
      }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async getCart(): Promise<Cart> {
    return this.request<Cart>(this.baseUrl)
  }

  async addToCart(data: AddToCartData): Promise<CartItem> {
    return this.request<CartItem>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCartItem(itemId: string, data: UpdateCartItemData): Promise<CartItem> {
    return this.request<CartItem>(`${this.baseUrl}/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async removeCartItem(itemId: string): Promise<void> {
    return this.request<void>(`${this.baseUrl}/${itemId}`, {
      method: 'DELETE',
    })
  }

  async clearCart(): Promise<void> {
    return this.request<void>(this.baseUrl, {
      method: 'DELETE',
    })
  }

  async submitRFQ(data: SubmitRFQData): Promise<{
    rfq: any
    message: string
    cartItemsCount: number
  }> {
    return this.request<{
      rfq: any
      message: string
      cartItemsCount: number
    }>(`${this.baseUrl}/submit-rfq`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

const cartAPI = new CartAPI()

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  cart: () => [...cartKeys.all, 'current'] as const,
}

// React Query hooks
export function useCart() {
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => cartAPI.getCart(),
    staleTime: 30 * 1000, // 30 seconds - cart changes frequently
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: cartAPI.addToCart,
    onMutate: async (newItem) => {
      // Cancel outgoing refetch
      await queryClient.cancelQueries({ queryKey: cartKeys.cart() })
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<Cart>(cartKeys.cart())
      
      // Optimistically update cart
      if (previousCart) {
        queryClient.setQueryData<Cart>(cartKeys.cart(), (old) => {
          if (!old) return old
          
          // Check if item already exists
          const existingItemIndex = old.items.findIndex(item => item.partId === newItem.partId)
          
          if (existingItemIndex >= 0) {
            // Update existing item quantity
            const updatedItems = [...old.items]
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + newItem.quantity
            }
            return { ...old, items: updatedItems }
          } else {
            // Add new optimistic item (will be replaced by server response)
            return {
              ...old,
              items: [
                {
                  id: 'temp-' + Date.now(),
                  cartId: old.id,
                  partId: newItem.partId,
                  quantity: newItem.quantity,
                  tolerance: newItem.tolerance || 'Standard',
                  leadTime: newItem.leadTime || 'Standard',
                  notes: newItem.notes,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  part: {
                    id: newItem.partId,
                    partName: 'Loading...',
                    fileName: '',
                    fileSize: 0,
                    fileType: '',
                    process: { id: '', name: 'Loading...', category: '' },
                    material: { id: '', name: 'Loading...' }
                  }
                },
                ...old.items
              ]
            }
          }
        })
      }
      
      return { previousCart }
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.cart(), context.previousCart)
      }
    },
    onSuccess: () => {
      // Refetch to get accurate data
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() })
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateCartItemData }) => 
      cartAPI.updateCartItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: cartAPI.removeCartItem,
    onMutate: async (itemId) => {
      // Cancel outgoing refetch
      await queryClient.cancelQueries({ queryKey: cartKeys.cart() })
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<Cart>(cartKeys.cart())
      
      // Optimistically remove item
      if (previousCart) {
        queryClient.setQueryData<Cart>(cartKeys.cart(), (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.filter(item => item.id !== itemId)
          }
        })
      }
      
      return { previousCart }
    },
    onError: (err, itemId, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.cart(), context.previousCart)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() })
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: cartAPI.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() })
    },
  })
}

export function useSubmitRFQ() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: cartAPI.submitRFQ,
    onSuccess: () => {
      // Invalidate cart and RFQ queries
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() })
      queryClient.invalidateQueries({ queryKey: ['rfqs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}