import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../lib/auth'

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

export const GET = requirePermission('versions', async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build filter
    const where: any = {}
    if (status) {
      where.status = status
    }

    // Get all pricing configurations (treating them as versions)
    const configurations = await prisma.pricingConfiguration.findMany({
      where,
      include: { routings: true },
      orderBy: { createdAt: 'desc' }
    })

    // Transform to version format
    const versions = configurations.map(config => ({
      id: config.id,
      version: `v${config.version}.0`,
      status: config.status,
      createdBy: config.createdBy,
      createdAt: config.createdAt.toISOString(),
      publishedAt: config.status === 'published' ? config.updatedAt.toISOString() : null,
      description: `Pricing configuration version ${config.version}`,
      changes: ['Configuration updated'], // TODO: Store actual changes
      configSnapshot: {
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
        }
      }
    }))

    return NextResponse.json(versions)
  } catch (error) {
    console.error('GET /api/v2/pricing-versions error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const POST = requirePermission('versions', async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
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

    // Get base configuration if specified
    let baseConfig = null
    if (basedOnVersionId) {
      baseConfig = await prisma.pricingConfiguration.findUnique({
        where: { id: basedOnVersionId },
        include: { routings: true }
      })
    } else {
      // Use the published configuration as base
      baseConfig = await prisma.pricingConfiguration.findFirst({
        where: { status: 'published' },
        include: { routings: true }
      })
    }

    // Extract version number from version string (e.g., "v2.1" -> 2.1 -> 2)
    const versionNumber = parseInt(version.replace('v', '').split('.')[0]) || 1

    // Create new configuration as draft
    const newConfig = await prisma.pricingConfiguration.create({
      data: {
        defaultTierMultipliers: baseConfig?.defaultTierMultipliers || {
          economy: 0.9,
          standard: 1.0,
          rush: 1.5
        },
        volumeBreaks: baseConfig?.volumeBreaks || [
          { id: "1", minQuantity: 1, maxQuantity: 9, discountPercent: 0 },
          { id: "2", minQuantity: 10, maxQuantity: 49, discountPercent: 5 },
          { id: "3", minQuantity: 50, maxQuantity: 99, discountPercent: 10 },
          { id: "4", minQuantity: 100, maxQuantity: null, discountPercent: 15 }
        ],
        minimumOrderValue: baseConfig?.minimumOrderValue || 50,
        version: versionNumber,
        status: 'draft',
        createdBy: user.id,
      },
      include: { routings: true }
    })

    // Copy routing pricing from base config if it exists
    if (baseConfig?.routings && baseConfig.routings.length > 0) {
      await prisma.routingPricing.createMany({
        data: baseConfig.routings.map(r => ({
          configurationId: newConfig.id,
          routingId: r.routingId,
          routingName: r.routingName,
          category: r.category,
          baseCost: r.baseCost,
          materialMarkup: r.materialMarkup,
          finishingCost: r.finishingCost,
          leadTime: r.leadTime,
          tierOverrides: r.tierOverrides as any,
          createdBy: user.id,
        }))
      })
    }

    // Get the created configuration with routings
    const finalConfig = await prisma.pricingConfiguration.findUnique({
      where: { id: newConfig.id },
      include: { routings: true }
    })

    // Transform to version format
    const versionResponse = {
      id: finalConfig!.id,
      version: `v${finalConfig!.version}.0`,
      status: finalConfig!.status,
      createdBy: finalConfig!.createdBy,
      createdAt: finalConfig!.createdAt.toISOString(),
      publishedAt: null,
      description,
      changes,
      configSnapshot: {
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
        }
      }
    }

    return NextResponse.json(versionResponse, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/pricing-versions error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})