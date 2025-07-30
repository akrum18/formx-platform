import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../../../lib/auth'

export const POST = requirePermission('versions', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    // Check if the version exists and is in draft status
    const draftConfig = await prisma.pricingConfiguration.findUnique({
      where: { id },
      include: { routings: true }
    })

    if (!draftConfig) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Version not found' },
        { status: 404 }
      )
    }

    if (draftConfig.status !== 'draft') {
      return NextResponse.json(
        { code: 'CONFLICT', message: 'Only draft versions can be published' },
        { status: 409 }
      )
    }

    // Archive any currently published configuration
    await prisma.pricingConfiguration.updateMany({
      where: { status: 'published' },
      data: { status: 'archived' }
    })

    // Publish the draft configuration
    const publishedConfig = await prisma.pricingConfiguration.update({
      where: { id },
      data: { 
        status: 'published',
        updatedAt: new Date()
      },
      include: { routings: true }
    })

    // Transform to version format for response
    const version = {
      id: publishedConfig.id,
      version: `v${publishedConfig.version}.0`,
      status: publishedConfig.status,
      createdBy: publishedConfig.createdBy,
      createdAt: publishedConfig.createdAt.toISOString(),
      publishedAt: publishedConfig.updatedAt.toISOString(),
      description: `Pricing configuration version ${publishedConfig.version}`,
      changes: ['Configuration published'],
      configSnapshot: {
        routings: publishedConfig.routings.map(r => ({
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
          defaultTierMultipliers: publishedConfig.defaultTierMultipliers,
          volumeBreaks: publishedConfig.volumeBreaks,
          minimumOrderValue: publishedConfig.minimumOrderValue
        }
      }
    }

    return NextResponse.json({
      message: 'Version published successfully',
      version
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Version not found' },
        { status: 404 }
      )
    }
    
    console.error('POST /api/v2/pricing-versions/[id]/publish error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})