import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'

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


export async function GET(request: NextRequest) {
  try {
    // Get the published pricing configuration
    const config = await prisma.pricingConfiguration.findFirst({
      where: { status: 'published' },
      include: {
        routings: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!config) {
      // Return default configuration if none exists
      const defaultConfig = {
        id: 'default',
        routings: [],
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
        version: 'v1.0',
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return NextResponse.json(defaultConfig)
    }

    // Transform database format to API format
    const response = {
      id: config.id,
      routings: config.routings.map(r => ({
        routingId: r.routingId,
        routingName: r.routingName,
        category: r.category,
        baseCost: r.baseCost,
        materialMarkup: r.materialMarkup,
        finishingCost: r.finishingCost,
        leadTime: r.leadTime,
        tierOverrides: r.tierOverrides || {}
      })),
      globalSettings: {
        defaultTierMultipliers: config.defaultTierMultipliers,
        volumeBreaks: config.volumeBreaks,
        minimumOrderValue: config.minimumOrderValue
      },
      version: `v${config.version}.0`,
      status: config.status,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/pricing-config error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
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

    const { routings, globalSettings } = validation.data

    // Get or create pricing configuration
    let config = await prisma.pricingConfiguration.findFirst({
      where: { status: 'published' },
      include: { routings: true }
    })

    if (!config) {
      // Create new configuration if none exists
      config = await prisma.pricingConfiguration.create({
        data: {
          defaultTierMultipliers: globalSettings.defaultTierMultipliers,
          volumeBreaks: globalSettings.volumeBreaks,
          minimumOrderValue: globalSettings.minimumOrderValue,
          status: 'published',
          createdBy: 'system', // TODO: Get from JWT token
        },
        include: { routings: true }
      })
    }

    // Update configuration
    const updatedConfig = await prisma.pricingConfiguration.update({
      where: { id: config.id },
      data: {
        defaultTierMultipliers: globalSettings.defaultTierMultipliers,
        volumeBreaks: globalSettings.volumeBreaks,
        minimumOrderValue: globalSettings.minimumOrderValue,
      },
      include: { routings: true }
    })

    // Delete existing routing pricing records
    await prisma.routingPricing.deleteMany({
      where: { configurationId: config.id }
    })

    // Create new routing pricing records
    if (routings.length > 0) {
      await prisma.routingPricing.createMany({
        data: routings.map(r => ({
          configurationId: config.id,
          routingId: r.routingId,
          routingName: r.routingName,
          category: r.category,
          baseCost: r.baseCost,
          materialMarkup: r.materialMarkup,
          finishingCost: r.finishingCost,
          leadTime: r.leadTime,
          tierOverrides: r.tierOverrides as any,
          createdBy: 'system', // TODO: Get from JWT token
        }))
      })
    }

    // Get updated configuration with routings
    const finalConfig = await prisma.pricingConfiguration.findUnique({
      where: { id: config.id },
      include: { routings: true }
    })

    // Transform to API format
    const response = {
      id: finalConfig!.id,
      routings: finalConfig!.routings.map(r => ({
        routingId: r.routingId,
        routingName: r.routingName,
        category: r.category,
        baseCost: r.baseCost,
        materialMarkup: r.materialMarkup,
        finishingCost: r.finishingCost,
        leadTime: r.leadTime,
        tierOverrides: r.tierOverrides || {}
      })),
      globalSettings: {
        defaultTierMultipliers: finalConfig!.defaultTierMultipliers,
        volumeBreaks: finalConfig!.volumeBreaks,
        minimumOrderValue: finalConfig!.minimumOrderValue
      },
      version: `v${finalConfig!.version}.0`,
      status: finalConfig!.status,
      createdAt: finalConfig!.createdAt.toISOString(),
      updatedAt: finalConfig!.updatedAt.toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('PUT /api/v2/pricing-config error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}