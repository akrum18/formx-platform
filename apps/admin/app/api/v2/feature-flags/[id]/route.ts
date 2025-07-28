import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const UpdateFeatureFlagSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  category: z.enum(['Processes', 'Finishes', 'Pricing', 'Experimental']).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const flag = mockFeatureFlags.find(f => f.id === params.id)
    
    if (!flag) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Feature flag not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(flag)
  } catch (error) {
    console.error(`GET /api/v2/feature-flags/${params.id} error:`, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))
    
    const body = await request.json()
    const validation = UpdateFeatureFlagSchema.safeParse(body)
    
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
    
    const flagIndex = mockFeatureFlags.findIndex(f => f.id === params.id)
    
    if (flagIndex === -1) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Feature flag not found' },
        { status: 404 }
      )
    }
    
    const updatedFlag = {
      ...mockFeatureFlags[flagIndex],
      ...validation.data,
      updatedAt: new Date().toISOString()
    }
    
    mockFeatureFlags[flagIndex] = updatedFlag
    console.log('🚩 Updated feature flag (DEMO):', updatedFlag)
    
    return NextResponse.json(updatedFlag)
  } catch (error) {
    console.error(`PUT /api/v2/feature-flags/${params.id} error:`, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const flagIndex = mockFeatureFlags.findIndex(f => f.id === params.id)
    
    if (flagIndex === -1) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Feature flag not found' },
        { status: 404 }
      )
    }
    
    const deletedFlag = mockFeatureFlags[flagIndex]
    mockFeatureFlags.splice(flagIndex, 1)
    console.log('🚩 Deleted feature flag (DEMO):', deletedFlag)
    
    return NextResponse.json({ message: 'Feature flag deleted successfully' })
  } catch (error) {
    console.error(`DELETE /api/v2/feature-flags/${params.id} error:`, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}