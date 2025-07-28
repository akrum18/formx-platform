import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas for updating specific routing pricing
const TierOverrideSchema = z.object({
  multiplier: z.number().min(0.1).optional(),
  materialMarkupOverride: z.number().min(0).optional(),
  finishingCostOverride: z.number().min(0).optional(),
  leadTimeOverride: z.number().int().min(1).optional()
})

const UpdateRoutingPricingSchema = z.object({
  baseCost: z.number().min(0).optional(),
  materialMarkup: z.number().min(0).optional(),
  finishingCost: z.number().min(0).optional(),
  leadTime: z.number().int().min(1).optional(),
  tierOverrides: z.object({
    economy: TierOverrideSchema.optional(),
    standard: TierOverrideSchema.optional(),
    rush: TierOverrideSchema.optional()
  }).optional()
})

// Mock pricing configuration data (should be shared, but for demo we'll recreate)
let mockPricingConfig = {
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
  ]
}

// GET /api/v2/pricing-config/[routingId] - Get specific routing pricing (DEMO VERSION)
export async function GET(
  request: NextRequest,
  { params }: { params: { routingId: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 150))

    const { routingId } = params

    // Find routing in mock configuration
    const routing = mockPricingConfig.routings.find(r => r.routingId === routingId)

    if (!routing) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Routing pricing not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(routing)

  } catch (error) {
    console.error('GET /api/v2/pricing-config/[routingId] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/pricing-config/[routingId] - Update specific routing pricing (DEMO VERSION)
export async function PUT(
  request: NextRequest,
  { params }: { params: { routingId: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const { routingId } = params
    const body = await request.json()
    
    // Validate request body
    const validation = UpdateRoutingPricingSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid routing pricing data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    // Find routing in mock configuration
    const routingIndex = mockPricingConfig.routings.findIndex(r => r.routingId === routingId)

    if (routingIndex === -1) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Routing pricing not found'
        },
        { status: 404 }
      )
    }

    const updateData = validation.data

    // Update routing in mock configuration
    const updatedRouting = {
      ...mockPricingConfig.routings[routingIndex],
      ...updateData
    }
    
    mockPricingConfig.routings[routingIndex] = updatedRouting

    console.log('✏️ Updated routing pricing (DEMO):', updatedRouting)

    return NextResponse.json(updatedRouting)

  } catch (error) {
    console.error('PUT /api/v2/pricing-config/[routingId] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}