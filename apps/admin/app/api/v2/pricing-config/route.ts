import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const TierOverrideSchema = z.object({
  multiplier: z.number().min(0.1).optional(),
  materialMarkupOverride: z.number().min(0).optional(),
  finishingCostOverride: z.number().min(0).optional(),
  leadTimeOverride: z.number().int().min(1).optional()
})

const RoutingPricingSchema = z.object({
  routingId: z.string().min(1, 'Routing ID is required'),
  routingName: z.string().min(1, 'Routing name is required'),
  category: z.string().min(1, 'Category is required'),
  baseCost: z.number().min(0, 'Base cost must be non-negative'),
  materialMarkup: z.number().min(0, 'Material markup must be non-negative'),
  finishingCost: z.number().min(0, 'Finishing cost must be non-negative'),
  leadTime: z.number().int().min(1, 'Lead time must be at least 1 day'),
  tierOverrides: z.object({
    economy: TierOverrideSchema.optional(),
    standard: TierOverrideSchema.optional(),
    rush: TierOverrideSchema.optional()
  }).optional()
})

const VolumeBreakSchema = z.object({
  id: z.string(),
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(1).nullable(),
  discountPercent: z.number().min(0).max(100)
})

const PricingConfigSchema = z.object({
  routings: z.array(RoutingPricingSchema),
  globalSettings: z.object({
    defaultTierMultipliers: z.object({
      economy: z.number().min(0.1),
      standard: z.number().min(0.1),
      rush: z.number().min(0.1)
    }),
    volumeBreaks: z.array(VolumeBreakSchema),
    minimumOrderValue: z.number().min(0)
  })
})

// Mock pricing configuration data
const mockPricingConfig = {
  id: "current",
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
    },
    {
      routingId: "4",
      routingName: "CNC Milling",
      category: "Machining",
      baseCost: 135.0,
      materialMarkup: 35,
      finishingCost: 0,
      leadTime: 3,
      tierOverrides: {}
    },
    {
      routingId: "5",
      routingName: "Laser Cutting",
      category: "Cutting",
      baseCost: 45.25,
      materialMarkup: 30,
      finishingCost: 0,
      leadTime: 2,
      tierOverrides: {
        economy: {
          multiplier: 0.85
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
  },
  version: "v2.1",
  status: "published",
  createdAt: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
  updatedAt: new Date(Date.now() - 1*24*60*60*1000).toISOString()
}

// GET /api/v2/pricing-config - Get current pricing configuration (DEMO VERSION)
export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    return NextResponse.json(mockPricingConfig)

  } catch (error) {
    console.error('GET /api/v2/pricing-config error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/pricing-config - Update pricing configuration (DEMO VERSION)
export async function PUT(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 400))

    const body = await request.json()
    
    // Validate request body
    const validation = PricingConfigSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pricing configuration data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Update mock configuration
    const updatedConfig = {
      ...mockPricingConfig,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    // Update the mock data store
    Object.assign(mockPricingConfig, updatedConfig)

    console.log('✏️ Updated pricing configuration (DEMO):', updatedConfig)

    return NextResponse.json(updatedConfig)

  } catch (error) {
    console.error('PUT /api/v2/pricing-config error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}