import { NextRequest, NextResponse } from 'next/server'

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

// Mock current pricing config (this would be fetched from the pricing-config API)
const getCurrentPricingConfig = () => ({
  routings: [
    {
      routingId: "1",
      routingName: "Laser Cutting - Deburring - Press Brake Bending - TIG Welding",
      category: "Sheet Metal",
      baseCost: 185.5,
      materialMarkup: 35,
      finishingCost: 0.15,
      leadTime: 5,
      tierOverrides: {
        rush: {
          multiplier: 1.6,
          leadTimeOverride: 3
        }
      }
    },
    {
      routingId: "2",
      routingName: "CNC Milling - Deburring - Anodizing",
      category: "Machining",
      baseCost: 245.75,
      materialMarkup: 40,
      finishingCost: 0.25,
      leadTime: 7,
      tierOverrides: {
        economy: {
          materialMarkupOverride: 35
        },
        rush: {
          materialMarkupOverride: 45,
          leadTimeOverride: 4
        }
      }
    }
  ],
  globalSettings: {
    defaultTierMultipliers: {
      economy: 0.9,
      standard: 1.0,
      rush: 1.5
    },
    volumeBreaks: [
      { id: "1", minQuantity: 1, maxQuantity: 9, discountPercent: 0 },
      { id: "2", minQuantity: 10, maxQuantity: 49, discountPercent: 5 },
      { id: "3", minQuantity: 50, maxQuantity: 99, discountPercent: 10 },
      { id: "4", minQuantity: 100, maxQuantity: null, discountPercent: 15 }
    ],
    minimumOrderValue: 50
  }
})

// POST /api/v2/pricing-versions/[id]/publish - Publish a draft pricing version (DEMO VERSION)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 500)) // Longer delay for publish operation

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

    const version = mockVersions[versionIndex]

    // Can only publish draft versions
    if (version.status !== 'draft') {
      return NextResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'Only draft versions can be published'
        },
        { status: 400 }
      )
    }

    // Archive currently published version (if any)
    const currentlyPublishedIndex = mockVersions.findIndex(v => v.status === 'published')
    if (currentlyPublishedIndex !== -1) {
      mockVersions[currentlyPublishedIndex] = {
        ...mockVersions[currentlyPublishedIndex],
        status: 'archived'
      }
    }

    // Get current pricing configuration and create snapshot
    const currentConfig = getCurrentPricingConfig()

    // Publish the version
    const publishedVersion = {
      ...version,
      status: 'published' as const,
      publishedAt: new Date().toISOString(),
      configSnapshot: currentConfig
    }

    mockVersions[versionIndex] = publishedVersion

    console.log('🚀 Published pricing version (DEMO):', publishedVersion)

    // Return all versions to update the UI
    return NextResponse.json({
      publishedVersion,
      allVersions: mockVersions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })

  } catch (error) {
    console.error('POST /api/v2/pricing-versions/[id]/publish error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}