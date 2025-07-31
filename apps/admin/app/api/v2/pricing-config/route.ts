import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../lib/auth'
import { bulkSyncRoutingsToConfiguration } from '../../../../lib/pricing-sync'

// Validation schemas
const TierOverrideSchema = z.object({
  multiplier: z.number().min(0.1).optional(),
  materialMarkupOverride: z.number().min(0).optional(),
  finishingCostOverride: z.number().min(0).optional(),
  leadTimeOverride: z.number().int().min(1).optional()
})

const RoutingPricingSchema = z.object({
  routingId: z.string().min(1, 'Routing ID is required'),
  routingName: z.string().min(1, 'Routing name is required').optional(), // Optional since derived from routing
  category: z.string().min(1, 'Category is required'),
  baseCost: z.number().min(0, 'Base cost must be non-negative'),
  materialMarkup: z.number().min(0, 'Material markup must be non-negative'),
  finishingCost: z.number().min(0, 'Finishing cost must be non-negative'),
  leadTime: z.number().int().min(1, 'Lead time must be at least 1 day'),
  tierOverrides: z.object({
    economy: TierOverrideSchema.optional(),
    standard: TierOverrideSchema.optional(),
    rush: TierOverrideSchema.optional()
  }).optional(),
  // Override flags to preserve manual changes
  isBaseCostOverridden: z.boolean().optional().default(false),
  isMarkupOverridden: z.boolean().optional().default(false),
  isFinishingOverridden: z.boolean().optional().default(false),
  isLeadTimeOverridden: z.boolean().optional().default(false)
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


export const GET = requirePermission('margins', async (request: NextRequest, user: any) => {
  try {
    // Get the most recent pricing configuration (draft or published)
    const config = await prisma.pricingConfiguration.findFirst({
      where: { 
        status: { in: ['draft', 'published'] }
      },
      include: {
        routings: {
          include: {
            routing: true // Include actual routing data
          }
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!config) {
      // Return default configuration if none exists
      const defaultConfig = {
        id: 'default',
        routings: [
          {
            routingId: 'routing-1',
            routingName: 'Laser Cutting + Bending',
            category: 'Sheet Metal',
            baseCost: 45.0,
            materialMarkup: 25,
            finishingCost: 2.5,
            leadTime: 5,
            tierOverrides: {}
          },
          {
            routingId: 'routing-2',
            routingName: 'CNC Milling',
            category: 'Machining',
            baseCost: 85.0,
            materialMarkup: 30,
            finishingCost: 3.0,
            leadTime: 7,
            tierOverrides: {}
          },
          {
            routingId: 'routing-3',
            routingName: '3D Printing (FDM)',
            category: 'Additive',
            baseCost: 25.0,
            materialMarkup: 40,
            finishingCost: 1.5,
            leadTime: 3,
            tierOverrides: {}
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
        routingName: r.routing?.name || 'Unknown Routing', // Get name from actual routing
        category: r.category,
        baseCost: r.baseCost,
        materialMarkup: r.materialMarkup,
        finishingCost: r.finishingCost,
        leadTime: r.leadTime,
        tierOverrides: r.tierOverrides || {},
        // Include override flags for UI
        isBaseCostOverridden: r.isBaseCostOverridden,
        isMarkupOverridden: r.isMarkupOverridden,
        isFinishingOverridden: r.isFinishingOverridden,
        isLeadTimeOverridden: r.isLeadTimeOverridden
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
})

export const PUT = requirePermission('margins', async (request: NextRequest, user: any) => {
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

    // Get or create pricing configuration (prefer draft, then published)
    let config = await prisma.pricingConfiguration.findFirst({
      where: { 
        status: { in: ['draft', 'published'] }
      },
      include: { routings: true },
      orderBy: { updatedAt: 'desc' }
    })

    if (!config) {
      // Create new configuration if none exists
      config = await prisma.pricingConfiguration.create({
        data: {
          defaultTierMultipliers: globalSettings.defaultTierMultipliers,
          volumeBreaks: globalSettings.volumeBreaks,
          minimumOrderValue: globalSettings.minimumOrderValue,
          status: 'published',
          createdBy: user.id,
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
      // Validate that all routing IDs exist
      const routingIds = routings.map(r => r.routingId)
      const existingRoutings = await prisma.routing.findMany({
        where: { id: { in: routingIds } },
        select: { id: true, name: true }
      })

      const validRoutings = routings.filter(r => 
        existingRoutings.some(er => er.id === r.routingId)
      )

      if (validRoutings.length > 0) {
        await prisma.routingPricing.createMany({
          data: validRoutings.map(r => ({
            configurationId: config.id,
            routingId: r.routingId,
            category: r.category,
            baseCost: r.baseCost,
            materialMarkup: r.materialMarkup,
            finishingCost: r.finishingCost,
            leadTime: r.leadTime,
            tierOverrides: r.tierOverrides as any,
            isBaseCostOverridden: r.isBaseCostOverridden || false,
            isMarkupOverridden: r.isMarkupOverridden || false,
            isFinishingOverridden: r.isFinishingOverridden || false,
            isLeadTimeOverridden: r.isLeadTimeOverridden || false,
            createdBy: user.id,
          }))
        })
      }
    } else {
      // If no routings provided, bulk sync existing routings
      await bulkSyncRoutingsToConfiguration(config.id, user.id)
    }

    // Get updated configuration with routings
    const finalConfig = await prisma.pricingConfiguration.findUnique({
      where: { id: config.id },
      include: { 
        routings: {
          include: {
            routing: true
          }
        }
      }
    })

    // Transform to API format
    const response = {
      id: finalConfig!.id,
      routings: finalConfig!.routings.map(r => ({
        routingId: r.routingId,
        routingName: r.routing?.name || 'Unknown Routing',
        category: r.category,
        baseCost: r.baseCost,
        materialMarkup: r.materialMarkup,
        finishingCost: r.finishingCost,
        leadTime: r.leadTime,
        tierOverrides: r.tierOverrides || {},
        isBaseCostOverridden: r.isBaseCostOverridden,
        isMarkupOverridden: r.isMarkupOverridden,
        isFinishingOverridden: r.isFinishingOverridden,
        isLeadTimeOverridden: r.isLeadTimeOverridden
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
})