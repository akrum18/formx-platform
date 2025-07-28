import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreateVersionSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  description: z.string().min(1, 'Description is required'),
  changes: z.array(z.string()).min(1, 'At least one change is required'),
  basedOnVersionId: z.string().optional()
})

const UpdateVersionSchema = z.object({
  description: z.string().min(1, 'Description is required').optional(),
  changes: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
})

// Mock pricing versions data
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
    configSnapshot: null // Draft versions don't have snapshots until published
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

// GET /api/v2/pricing-versions - List all pricing versions (DEMO VERSION)
export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const createdBy = searchParams.get('createdBy')

    // Filter versions
    let filteredVersions = mockVersions
    if (status) {
      filteredVersions = filteredVersions.filter(v => v.status === status)
    }
    if (createdBy) {
      filteredVersions = filteredVersions.filter(v => 
        v.createdBy.toLowerCase().includes(createdBy.toLowerCase())
      )
    }

    // Sort by creation date (newest first)
    filteredVersions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(filteredVersions)

  } catch (error) {
    console.error('GET /api/v2/pricing-versions error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/pricing-versions - Create a new pricing version (DEMO VERSION)
export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 400))

    const body = await request.json()
    
    // Validate request body
    const validation = CreateVersionSchema.safeParse(body)
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

    const { version, description, changes, basedOnVersionId } = validation.data

    // Create new version
    const newVersion = {
      id: (Date.now() + Math.random()).toString(),
      version,
      status: "draft" as const,
      createdBy: "Current User", // Would come from auth
      createdAt: new Date().toISOString(),
      publishedAt: null,
      description,
      changes,
      configSnapshot: null // Draft versions don't have snapshots
    }

    // Add to mock store
    mockVersions.unshift(newVersion) // Add to beginning for newest first

    console.log('✏️ Created pricing version (DEMO):', newVersion)

    return NextResponse.json(newVersion, { status: 201 })

  } catch (error) {
    console.error('POST /api/v2/pricing-versions error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}