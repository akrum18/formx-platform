import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../../lib/auth'

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
  }).optional(),
  // Override flags to preserve manual changes
  isBaseCostOverridden: z.boolean().optional(),
  isMarkupOverridden: z.boolean().optional(),
  isFinishingOverridden: z.boolean().optional(),
  isLeadTimeOverridden: z.boolean().optional()
})

export const GET = requirePermission('margins', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ routingId: string }> }
) => {
  try {
    const { routingId } = await params

    // Get the published pricing configuration
    const config = await prisma.pricingConfiguration.findFirst({
      where: { status: 'published' },
      include: {
        routings: {
          where: { routingId },
          include: {
            routing: true // Include actual routing data
          }
        }
      }
    })

    if (!config || config.routings.length === 0) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Routing pricing not found' },
        { status: 404 }
      )
    }

    const routing = config.routings[0]
    const response = {
      routingId: routing.routingId,
      routingName: routing.routing?.name || 'Unknown Routing',
      category: routing.category,
      baseCost: routing.baseCost,
      materialMarkup: routing.materialMarkup,
      finishingCost: routing.finishingCost,
      leadTime: routing.leadTime,
      tierOverrides: routing.tierOverrides || {},
      isBaseCostOverridden: routing.isBaseCostOverridden,
      isMarkupOverridden: routing.isMarkupOverridden,
      isFinishingOverridden: routing.isFinishingOverridden,
      isLeadTimeOverridden: routing.isLeadTimeOverridden
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/pricing-config/[routingId] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const PUT = requirePermission('margins', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ routingId: string }> }
) => {
  try {
    const { routingId } = await params
    const body = await request.json()

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

    const updateData = validation.data

    // Get the published pricing configuration
    const config = await prisma.pricingConfiguration.findFirst({
      where: { status: 'published' },
      include: {
        routings: {
          where: { routingId },
          include: {
            routing: true // Include actual routing data
          }
        }
      }
    })

    if (!config || config.routings.length === 0) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Routing pricing not found' },
        { status: 404 }
      )
    }

    const routingPricing = config.routings[0]

    // Prepare update data with override flags
    const updateDataWithFlags: any = { ...updateData }
    
    // Set override flags when values are manually changed
    if (updateData.baseCost !== undefined) {
      updateDataWithFlags.isBaseCostOverridden = true
    }
    if (updateData.materialMarkup !== undefined) {
      updateDataWithFlags.isMarkupOverridden = true
    }
    if (updateData.finishingCost !== undefined) {
      updateDataWithFlags.isFinishingOverridden = true
    }
    if (updateData.leadTime !== undefined) {
      updateDataWithFlags.isLeadTimeOverridden = true
    }

    // Update the routing pricing
    const updatedRouting = await prisma.routingPricing.update({
      where: { id: routingPricing.id },
      data: {
        ...updateDataWithFlags,
        tierOverrides: updateData.tierOverrides !== undefined 
          ? updateData.tierOverrides as any
          : routingPricing.tierOverrides
      },
      include: {
        routing: true
      }
    })

    // Also update the configuration's updatedAt timestamp
    await prisma.pricingConfiguration.update({
      where: { id: config.id },
      data: { updatedAt: new Date() }
    })

    const response = {
      routingId: updatedRouting.routingId,
      routingName: updatedRouting.routing?.name || 'Unknown Routing',
      category: updatedRouting.category,
      baseCost: updatedRouting.baseCost,
      materialMarkup: updatedRouting.materialMarkup,
      finishingCost: updatedRouting.finishingCost,
      leadTime: updatedRouting.leadTime,
      tierOverrides: updatedRouting.tierOverrides || {},
      isBaseCostOverridden: updatedRouting.isBaseCostOverridden,
      isMarkupOverridden: updatedRouting.isMarkupOverridden,
      isFinishingOverridden: updatedRouting.isFinishingOverridden,
      isLeadTimeOverridden: updatedRouting.isLeadTimeOverridden
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('PUT /api/v2/pricing-config/[routingId] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})