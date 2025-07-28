# FormX Admin Platform - Development Guide for AI Agents

## Quick Start for New Agents

### 1. Understanding the Codebase
Before making changes, read these files in order:
1. **MIGRATION_SUMMARY.md** - What's been done and current status
2. **ARCHITECTURE.md** - Technical patterns and structure
3. **This file** - How to work with the codebase

### 2. Current State Check
```bash
# Verify the application builds
npm run build

# Start development server
npm run dev
```

## Established Patterns - FOLLOW THESE

### 1. API Endpoint Pattern
When creating new API endpoints, follow this exact structure:

```typescript
// /app/api/v2/[entity]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 1. Validation Schema
const EntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // ... other fields
})

// 2. Mock Data Store (for demo)
let mockEntities = [
  { id: "1", name: "Example", /* ... */ }
]

// 3. GET Endpoint
export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200)) // Demo delay
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    
    // Filter and return data
    let filtered = mockEntities
    if (filter) {
      filtered = filtered.filter(/* filtering logic */)
    }
    
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('GET /api/v2/entity error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

// 4. POST Endpoint
export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const body = await request.json()
    const validation = EntitySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }
    
    const newEntity = {
      id: (Date.now() + Math.random()).toString(),
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    mockEntities.push(newEntity)
    console.log('✏️ Created entity (DEMO):', newEntity)
    
    return NextResponse.json(newEntity, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/entity error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}
```

### 2. React Query Hooks Pattern
**File:** `/lib/api/[entity].ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 1. TypeScript Interfaces
export interface Entity {
  id: string
  name: string
  // ... other fields
  createdAt: string
  updatedAt: string
}

export interface CreateEntityData {
  name: string
  // ... required fields only
}

export interface UpdateEntityData {
  name?: string
  // ... optional fields
}

// 2. API Client Class
class EntityAPI {
  private baseUrl = '/api/v2/entity'

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

  async getEntities(filters?: any): Promise<Entity[]> {
    const params = new URLSearchParams()
    if (filters?.active !== undefined) {
      params.append('active', filters.active.toString())
    }
    
    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl
    return this.request<Entity[]>(url)
  }

  async createEntity(data: CreateEntityData): Promise<Entity> {
    return this.request<Entity>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ... other CRUD methods
}

const entityAPI = new EntityAPI()

// 3. Query Keys
export const entityKeys = {
  all: ['entity'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters?: any) => [...entityKeys.lists(), filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (id: string) => [...entityKeys.details(), id] as const,
}

// 4. React Query Hooks
export function useEntities(filters?: any) {
  return useQuery({
    queryKey: entityKeys.list(filters),
    queryFn: () => entityAPI.getEntities(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: entityAPI.createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() })
    },
  })
}

// ... other mutation hooks
```

### 3. Page Component Pattern
**File:** `/app/[entity]/page.tsx`

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  type Entity
} from "@/lib/api/entities"

export default function EntitiesPage() {
  // 1. API Hooks
  const { data: entities = [], isLoading, error } = useEntities()
  const createEntity = useCreateEntity()
  const updateEntity = useUpdateEntity()
  const deleteEntity = useDeleteEntity()

  // 2. UI State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    // ... other form fields
  })

  // 3. Handlers
  const handleSave = async () => {
    if (!formData.name) return // Basic validation

    try {
      if (editingEntity) {
        await updateEntity.mutateAsync({
          id: editingEntity.id,
          data: formData
        })
      } else {
        await createEntity.mutateAsync(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save entity:', error)
    }
  }

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity)
    setFormData({
      name: entity.name,
      // ... populate form fields
    })
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingEntity(null)
    setFormData({
      name: "",
      // ... reset form fields
    })
    setIsDialogOpen(true)
  }

  // 4. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  // 5. Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              Failed to load entities: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // 6. Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      {/* Header, Stats, Table, Dialogs */}
    </div>
  )
}
```

## Critical Rules for Agents

### ✅ DO
1. **Follow established patterns exactly** - Don't reinvent what exists
2. **Use existing UI components** - Check `/components/ui/` first
3. **Add loading and error states** - Every page needs both
4. **Test the build** - Run `npm run build` before finishing
5. **Use TypeScript properly** - Define interfaces for all data
6. **Follow the query key pattern** - Hierarchical cache keys
7. **Add proper error handling** - Try/catch with user feedback
8. **Use the TodoWrite tool** - Track progress on complex tasks
9. **Check for existing APIs** - Don't duplicate existing endpoints
10. **Maintain consistent styling** - Use the established design system

### ❌ DON'T
1. **Break existing functionality** - Test before and after changes
2. **Create new patterns** - Use established conventions
3. **Skip error handling** - Every API call needs error handling
4. **Ignore TypeScript errors** - Fix all type issues
5. **Use different styling approaches** - Stick to Tailwind + established classes
6. **Create inconsistent APIs** - Follow the endpoint patterns
7. **Skip loading states** - Users need visual feedback
8. **Modify query key patterns** - This breaks caching
9. **Add external dependencies** - Work with existing packages
10. **Create security vulnerabilities** - Validate all inputs

## Common Tasks & Solutions

### Adding a New Entity Module
1. **API Routes:** Create `/app/api/v2/[entity]/route.ts` and `[id]/route.ts`
2. **Hooks:** Create `/lib/api/[entity].ts` with React Query hooks
3. **Page:** Create `/app/[entity]/page.tsx` following the page pattern
4. **Types:** Define interfaces in the hooks file
5. **Test:** Verify build and basic functionality

### Modifying Existing Entities
1. **Check current implementation** - Understand existing patterns
2. **Update API first** - Modify endpoints and validation
3. **Update hooks second** - Add new fields/operations
4. **Update UI last** - Modify forms and displays
5. **Test thoroughly** - Verify no regressions

### Cross-Module Integration
1. **Use query invalidation** - Update related caches
2. **Share types when appropriate** - Import from existing modules
3. **Follow data flow patterns** - Don't create circular dependencies
4. **Test integration points** - Verify cross-module functionality

## Debugging Guide

### Common Issues
1. **Build Failures:** Usually TypeScript errors or missing imports
2. **Query Not Updating:** Check query key consistency
3. **Form Not Saving:** Verify mutation hook integration
4. **Missing Data:** Check API endpoint and mock data
5. **Styling Issues:** Verify Tailwind classes and component imports

### Debug Commands
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Build and check for issues
npm run build

# Start development server
npm run dev
```

### When to Ask for Help
- If patterns aren't clear from existing code
- If build errors persist after following patterns
- If unsure about architectural decisions
- If integration between modules is complex

## Code Quality Standards

### TypeScript
- Define interfaces for all data structures
- Use proper typing for all function parameters
- No `any` types unless absolutely necessary
- Export types that might be reused

### React Components
- Use functional components with hooks
- Implement proper loading and error states
- Follow established UI patterns
- Keep components focused and reusable

### API Design
- Use Zod for validation
- Return consistent error formats
- Include proper HTTP status codes
- Add appropriate delays for demo UX

### Performance
- Use React Query caching effectively
- Implement proper query invalidation
- Avoid unnecessary re-renders
- Use loading states to improve perceived performance

## Final Checklist Before Completion

- [ ] Code follows established patterns
- [ ] All TypeScript errors resolved
- [ ] Build succeeds (`npm run build`)
- [ ] Loading states implemented
- [ ] Error handling added
- [ ] API endpoints follow conventions
- [ ] React Query hooks properly structured
- [ ] UI matches existing design system
- [ ] Functionality tested manually
- [ ] No console errors in browser

---

**Remember:** The goal is consistency and maintainability. When in doubt, look at how existing modules are implemented and follow those exact patterns.