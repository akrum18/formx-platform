# FormX Admin Platform - Technical Architecture

## System Overview

The FormX Admin Platform is a Next.js 15.2.4 application using React Query for state management and API integration. It provides a comprehensive manufacturing management interface with pricing, routing, and version control capabilities.

## Technology Stack

### Core Framework
- **Next.js 15.2.4** - App Router, Server Components
- **React 19.1.0** - UI framework
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Styling and design system

### State Management
- **@tanstack/react-query** - Server state management
- **React useState** - Local UI state
- **localStorage** - Client-side persistence (auth tokens)

### UI Components
- **Custom UI Components** - Built on Radix UI primitives
- **Lucide React** - Icon system
- **Tailwind CSS** - Responsive design utilities

### Validation & APIs
- **Zod** - Runtime schema validation
- **Next.js API Routes** - Backend API implementation

## Architecture Patterns

### API Layer Structure

```typescript
// API Client Pattern
class EntityAPI {
  private baseUrl = '/api/v2/entity'
  
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    // Standardized error handling, auth headers
  }
  
  async getEntities(filters?): Promise<Entity[]> { /* ... */ }
  async createEntity(data): Promise<Entity> { /* ... */ }
  // ... CRUD operations
}
```

### React Query Integration

```typescript
// Query Keys Pattern
export const entityKeys = {
  all: ['entity'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters) => [...entityKeys.lists(), filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (id) => [...entityKeys.details(), id] as const,
}

// Hook Pattern
export function useEntities(filters?) {
  return useQuery({
    queryKey: entityKeys.list(filters),
    queryFn: () => entityAPI.getEntities(filters),
    staleTime: 5 * 60 * 1000,
  })
}
```

### Component Architecture

```typescript
// Page Component Pattern
export default function EntityPage() {
  // 1. API Hooks
  const { data, isLoading, error } = useEntities()
  const createMutation = useCreateEntity()
  
  // 2. UI State
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({})
  
  // 3. Handlers
  const handleSave = async () => { /* ... */ }
  
  // 4. Loading/Error States
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorAlert />
  
  // 5. Main Render
  return <MainUI />
}
```

## Data Flow Architecture

### Request Flow
```
User Action → 
React Component → 
React Query Hook → 
API Client → 
Next.js API Route → 
Validation (Zod) → 
Business Logic → 
Mock/Database Response → 
React Query Cache → 
UI Update
```

### Cache Management
```
Query Invalidation Strategy:
- Create/Update/Delete → Invalidate lists()
- Update → Invalidate specific detail(id)
- Publish Version → Invalidate pricing-config
- Cross-module → Invalidate related queries
```

## Module Structure

### Materials Module
```
/materials/
├── page.tsx                 # Main UI component
├── /api/v2/materials/
│   ├── route.ts            # GET /api/v2/materials, POST
│   └── [id]/route.ts       # GET/PUT/DELETE /api/v2/materials/[id]
└── /lib/api/materials.ts   # React Query hooks & API client
```

**Key Features:**
- Material library management (metals, plastics, composites)
- Cost tracking and supplier information
- CSV import/export functionality
- Search, filtering, and table controls

### Processes Module
```
/processes/
├── page.tsx
├── /api/v2/processes/
│   ├── route.ts
│   └── [id]/route.ts
└── /lib/api/processes.ts
```

**Key Features:**
- Manufacturing process definitions
- Hourly rates and setup times
- Category-based organization
- Equipment and capability tracking

### Routings Module
```
/routings/
├── page.tsx
├── /api/v2/routings/
│   ├── route.ts
│   └── [id]/route.ts
└── /lib/api/routings.ts
```

**Key Features:**
- Multi-step manufacturing sequences
- Process step configuration
- Lead time and cost calculations
- Routing duplication and templates

### Finishes Module
```
/finishes/
├── page.tsx
├── /api/v2/finishes/
│   ├── route.ts
│   └── [id]/route.ts
└── /lib/api/finishes.ts
```

**Key Features:**
- Surface treatment options
- Cost per square inch calculations
- Lead time tracking
- Finish type categorization

### Pricing Configuration (Margins)
```
/margins/
├── page.tsx
├── /api/v2/pricing-config/
│   ├── route.ts            # Full configuration GET/PUT
│   └── [routingId]/route.ts # Individual routing pricing
└── /lib/api/pricing-config.ts
```

**Key Features:**
- Routing-based pricing configuration
- Tier multipliers (economy/standard/rush)
- Volume break discounts
- Material markup and finishing costs
- Live pricing calculations
- Process pricing integration

### Version Control (Versions)
```
/versions/
├── page.tsx
├── /api/v2/pricing-versions/
│   ├── route.ts                    # List/Create versions
│   ├── [id]/route.ts              # Individual version CRUD
│   └── [id]/publish/route.ts      # Publishing workflow
└── /lib/api/pricing-versions.ts
```

**Key Features:**
- Draft version creation and management
- Change tracking and documentation
- Publishing workflow with auto-archiving
- Configuration snapshots
- Version history and rollback capability

## Cross-Module Integration

### Margins ↔ Versions Workflow
```typescript
// In margins page - create version from current config
const handleCreateVersion = () => {
  // Opens version dialog with current pricing state
  setVersionDialogOpen(true)
}

// In versions page - publish version updates active config
const handlePublish = async (versionId) => {
  await publishVersion.mutateAsync(versionId)
  // Automatically invalidates pricing-config cache
}
```

### Shared Components
- **SortableTableHeader** - Column sorting across all tables
- **TableControls** - Filtering and grouping controls
- **CSVImportDialog** - Bulk data import functionality
- **LoadingSkeletons** - Consistent loading states
- **ErrorAlerts** - Standardized error displays

## Error Handling Strategy

### API Level
```typescript
// Standardized error responses
return NextResponse.json(
  {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    details: validation.error.errors
  },
  { status: 400 }
)
```

### Client Level
```typescript
// Component error boundaries
if (error) {
  return (
    <Alert className="bg-red-50 border-red-200">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-red-700">
        Failed to load data: {error.message}
      </AlertDescription>
    </Alert>
  )
}
```

## Performance Considerations

### React Query Optimizations
- **Stale Time:** 5 minutes for configuration data
- **Cache Management:** Hierarchical invalidation
- **Background Refetch:** Automatic data freshness
- **Optimistic Updates:** Immediate UI feedback

### Bundle Optimization
- **Code Splitting:** Page-level chunks
- **Tree Shaking:** Unused code elimination
- **Shared Components:** Reusable UI patterns

## Security Implementation

### Authentication
- JWT tokens stored in localStorage
- Bearer token authentication for API requests
- Client-side route protection (would be server-side in production)

### Data Validation
- **Server-side:** Zod schema validation on all API endpoints
- **Client-side:** TypeScript type checking and form validation
- **SQL Injection Prevention:** Parameterized queries (in real DB implementation)

## Monitoring & Debugging

### Development Tools
- **React Query Devtools** - Cache inspection
- **Next.js Built-in Debugging** - Server and client logging
- **TypeScript Compiler** - Type checking and error detection

### Logging Strategy
```typescript
// Consistent logging pattern
console.log('✏️ Updated entity (DEMO):', result)
console.error('API Error:', error)
```

## Deployment Considerations

### Build Process
- **Next.js Build:** `npm run build`
- **Static Generation:** Pre-rendered pages where possible
- **API Routes:** Server-side rendering for dynamic content

### Environment Configuration
- **Development:** Local development server
- **Staging:** Mock APIs for demonstration
- **Production:** Real database integration required

---

*This architecture document serves as the technical foundation for understanding and extending the FormX Admin Platform.*