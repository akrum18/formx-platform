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
  }).optional()
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
          where: { routingId }
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
      routingName: routing.routingName,
      category: routing.category,
      baseCost: routing.baseCost,
      materialMarkup: routing.materialMarkup,
      finishingCost: routing.finishingCost,
      leadTime: routing.leadTime,
      tierOverrides: routing.tierOverrides || {}
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
          where: { routingId }
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

    // Update the routing pricing
    const updatedRouting = await prisma.routingPricing.update({
      where: { id: routingPricing.id },
      data: {
        ...updateData,
        tierOverrides: updateData.tierOverrides !== undefined 
          ? updateData.tierOverrides as any
          : routingPricing.tierOverrides
      }
    })

    // Also update the configuration's updatedAt timestamp
    await prisma.pricingConfiguration.update({
      where: { id: config.id },
      data: { updatedAt: new Date() }
    })

    const response = {
      routingId: updatedRouting.routingId,
      routingName: updatedRouting.routingName,
      category: updatedRouting.category,
      baseCost: updatedRouting.baseCost,
      materialMarkup: updatedRouting.materialMarkup,
      finishingCost: updatedRouting.finishingCost,
      leadTime: updatedRouting.leadTime,
      tierOverrides: updatedRouting.tierOverrides || {}
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