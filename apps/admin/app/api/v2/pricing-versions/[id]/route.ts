import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const UpdateVersionSchema = z.object({
  description: z.string().min(1, 'Description is required').optional(),
  changes: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
})

// Mock pricing versions data (should be shared, but for demo we'll recreate)
let mockVersions = [
  {
    id: "1",
    version: "v2.1",
    status: "published",
    createdBy: "John Smith",
    createdAt: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    publishedAt: new Date(Date.now() - 25*24*60*60*1000).toISOString(),
    description: "Updated aluminum pricing and added titanium materials",
    changes: [
      "Increased aluminum 6061 markup to 25%",
      "Added titanium Ti-6Al-4V material",
      "Updated 5-axis hourly rate to $120"
    ],
    configSnapshot: {
      routings: [
        {
          routingId: "1",
          routingName: "Laser Cutting - Deburring - Press Brake Bending - TIG Welding",
          category: "Sheet Metal",
          baseCost: 185.5,
          materialMarkup: 35,
          finishingCost: 0.15,
          leadTime: 5
        }
      ],
      globalSettings: {
        defaultTierMultipliers: { economy: 0.9, standard: 1.0, rush: 1.5 },
        volumeBreaks: [
          { id: "1", minQuantity: 1, maxQuantity: 9, discountPercent: 0 }
        ],
        minimumOrderValue: 50
      }
    }
  },
  {
    id: "2",
    version: "v2.2-draft",
    status: "draft",
    createdBy: "Sarah Johnson",
    createdAt: new Date(Date.now() - 15*24*60*60*1000).toISOString(),
    publishedAt: null,
    description: "Q1 2024 pricing adjustments and new coating options",
    changes: [
      "Added powder coating options",
      "Adjusted rush job multiplier to 1.5x",
      "Updated minimum order value to $50"
    ],
    configSnapshot: null
  },
  {
    id: "3",
    version: "v2.0",
    status: "archived",
    createdBy: "Mike Davis", 
    createdAt: new Date(Date.now() - 60*24*60*60*1000).toISOString(),
    publishedAt: new Date(Date.now() - 50*24*60*60*1000).toISOString(),
    description: "Major pricing restructure with new process categories",
    changes: [
      "Restructured process categories",
      "Implemented volume-based pricing",
      "Added complexity multipliers"
    ],
    configSnapshot: {
      routings: [],
      globalSettings: {
        defaultTierMultipliers: { economy: 0.85, standard: 1.0, rush: 1.4 },
        volumeBreaks: [],
        minimumOrderValue: 25
      }
    }
  }
]

// GET /api/v2/pricing-versions/[id] - Get specific pricing version (DEMO VERSION)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 150))

    const { id } = params

    // Find version in mock store
    const version = mockVersions.find(v => v.id === id)

    if (!version) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Pricing version not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(version)

  } catch (error) {
    console.error('GET /api/v2/pricing-versions/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/pricing-versions/[id] - Update specific pricing version (DEMO VERSION)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const { id } = params
    const body = await request.json()
    
    // Validate request body
    const validation = UpdateVersionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid version data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    // Find version in mock store
    const versionIndex = mockVersions.findIndex(v => v.id === id)

    if (versionIndex === -1) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Pricing version not found'
        },
        { status: 404 }
      )
    }

    const updateData = validation.data

    // Update version in mock store
    const updatedVersion = {
      ...mockVersions[versionIndex],
      ...updateData,
      ...(updateData.status === 'published' && !mockVersions[versionIndex].publishedAt ? {
        publishedAt: new Date().toISOString()
      } : {})
    }
    
    mockVersions[versionIndex] = updatedVersion

    console.log('✏️ Updated pricing version (DEMO):', updatedVersion)

    return NextResponse.json(updatedVersion)

  } catch (error) {
    console.error('PUT /api/v2/pricing-versions/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/pricing-versions/[id] - Delete specific pricing version (DEMO VERSION)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))

    const { id } = params

    // Find version in mock store
    const versionIndex = mockVersions.findIndex(v => v.id === id)

    if (versionIndex === -1) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Pricing version not found'
        },
        { status: 404 }
      )
    }

    // Only allow deletion of draft versions
    if (mockVersions[versionIndex].status !== 'draft') {
      return NextResponse.json(
        {
          code: 'FORBIDDEN',
          message: 'Only draft versions can be deleted'
        },
        { status: 403 }
      )
    }

    // Remove from mock store
    mockVersions.splice(versionIndex, 1)

    console.log('🗑️ Deleted pricing version (DEMO):', id)

    return NextResponse.json({ message: 'Pricing version deleted successfully' })

  } catch (error) {
    console.error('DELETE /api/v2/pricing-versions/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}