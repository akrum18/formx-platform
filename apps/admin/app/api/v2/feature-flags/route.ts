import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const FeatureFlagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100),
  category: z.enum(['Processes', 'Finishes', 'Pricing', 'Experimental']),
})

let mockFeatureFlags = [
  {
    id: "5axis-cnc",
    name: "5-Axis CNC Quoting",
    description: "Enable 5-axis CNC machining in the quoting system",
    enabled: true,
    rolloutPercentage: 100,
    category: "Processes",
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-20T10:30:00Z"
  },
  {
    id: "coating-options",
    name: "Coating & Finishing Options",
    description: "Show coating and finishing options in quotes",
    enabled: true,
    rolloutPercentage: 100,
    category: "Finishes",
    createdAt: "2024-01-10T09:15:00Z",
    updatedAt: "2024-01-18T14:22:00Z"
  },
  {
    id: "rush-orders",
    name: "Rush Order Pricing",
    description: "Allow customers to request rush delivery with premium pricing",
    enabled: true,
    rolloutPercentage: 100,
    category: "Pricing",
    createdAt: "2024-01-12T11:45:00Z",
    updatedAt: "2024-01-25T16:10:00Z"
  },
  {
    id: "volume-discounts",
    name: "Volume Discount Display",
    description: "Show volume-based pricing tiers to customers",
    enabled: false,
    rolloutPercentage: 25,
    category: "Pricing",
    createdAt: "2024-01-18T13:20:00Z",
    updatedAt: "2024-01-26T09:45:00Z"
  },
  {
    id: "material-suggestions",
    name: "Material Suggestions",
    description: "AI-powered material recommendations based on part geometry",
    enabled: false,
    rolloutPercentage: 10,
    category: "Experimental",
    createdAt: "2024-01-20T15:30:00Z",
    updatedAt: "2024-01-27T11:15:00Z"
  },
  {
    id: "instant-quotes",
    name: "Instant Quote Generation",
    description: "Generate quotes without manual review for simple parts",
    enabled: false,
    rolloutPercentage: 5,
    category: "Experimental",
    createdAt: "2024-01-22T10:00:00Z",
    updatedAt: "2024-01-28T08:30:00Z"
  },
]

export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const enabled = searchParams.get('enabled')

    let filtered = mockFeatureFlags

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(flag => 
        flag.name.toLowerCase().includes(searchLower) ||
        flag.description.toLowerCase().includes(searchLower) ||
        flag.category.toLowerCase().includes(searchLower)
      )
    }

    if (category) {
      filtered = filtered.filter(flag => flag.category === category)
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true'
      filtered = filtered.filter(flag => flag.enabled === isEnabled)
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('GET /api/v2/feature-flags error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const body = await request.json()
    const validation = FeatureFlagSchema.safeParse(body)
    
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
    
    const newFlag = {
      id: validation.data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    mockFeatureFlags.push(newFlag)
    console.log('🚩 Created feature flag (DEMO):', newFlag)
    
    return NextResponse.json(newFlag, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/feature-flags error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}