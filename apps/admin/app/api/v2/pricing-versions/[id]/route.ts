import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'

const UpdateVersionSchema = z.object({
  description: z.string().min(1, 'Description is required').optional(),
  changes: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const config = await prisma.pricingConfiguration.findUnique({
      where: { id },
      include: { routings: true }
    })

    if (!config) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Version not found' },
        { status: 404 }
      )
    }

    // Transform to version format
    const version = {
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
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error('GET /api/v2/pricing-versions/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
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

    const updateData = validation.data

    // Only allow status updates for now (description/changes would need schema updates)
    const updatedConfig = await prisma.pricingConfiguration.update({
      where: { id },
      data: {
        status: updateData.status,
      },
      include: { routings: true }
    })

    // Transform to version format
    const version = {
      id: updatedConfig.id,
      version: `v${updatedConfig.version}.0`,
      status: updatedConfig.status,
      createdBy: updatedConfig.createdBy,
      createdAt: updatedConfig.createdAt.toISOString(),
      publishedAt: updatedConfig.status === 'published' ? updatedConfig.updatedAt.toISOString() : null,
      description: updateData.description || `Pricing configuration version ${updatedConfig.version}`,
      changes: updateData.changes || ['Configuration updated'],
      configSnapshot: {
        routings: updatedConfig.routings.map(r => ({
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
          defaultTierMultipliers: updatedConfig.defaultTierMultipliers,
          volumeBreaks: updatedConfig.volumeBreaks,
          minimumOrderValue: updatedConfig.minimumOrderValue
        }
      }
    }

    return NextResponse.json(version)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Version not found' },
        { status: 404 }
      )
    }
    
    console.error('PUT /api/v2/pricing-versions/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // First check if this version exists and is not published
    const config = await prisma.pricingConfiguration.findUnique({
      where: { id }
    })

    if (!config) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Version not found' },
        { status: 404 }
      )
    }

    if (config.status === 'published') {
      return NextResponse.json(
        { code: 'CONFLICT', message: 'Cannot delete published version' },
        { status: 409 }
      )
    }

    // Delete routing pricing records first (due to foreign key constraint)
    await prisma.routingPricing.deleteMany({
      where: { configurationId: id }
    })

    // Delete the configuration
    await prisma.pricingConfiguration.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Version deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Version not found' },
        { status: 404 }
      )
    }
    
    console.error('DELETE /api/v2/pricing-versions/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}