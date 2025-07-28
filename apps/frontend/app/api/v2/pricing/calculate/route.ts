import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@formx/database'
import { requireAuth, AuthError } from '@formx/auth'
import { z } from 'zod'

// Validation schema for pricing calculation
const PricingCalculationSchema = z.object({
  parts: z.array(z.object({
    quantity: z.number().int().positive(),
    routingId: z.string(),
    materialId: z.string(),
    finishId: z.string().nullable().optional()
  })).min(1, 'At least one part is required'),
  tier: z.enum(['economy', 'standard', 'rush'])
})

// POST /api/v2/pricing/calculate - Calculate price for parts
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:pricing', 'create:quotes'])(request)

    const body = await request.json()
    
    // Validate request body
    const validation = PricingCalculationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { parts, tier } = validation.data

    // Get current pricing configuration
    const pricingConfig = await prisma.pricingConfiguration.findFirst({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' }
    })

    if (!pricingConfig) {
      return NextResponse.json(
        {
          code: 'NO_PRICING_CONFIG',
          message: 'No active pricing configuration found'
        },
        { status: 404 }
      )
    }

    // Parse tier multipliers
    const tierMultipliers = pricingConfig.defaultTierMultipliers as any
    const tierMultiplier = tierMultipliers[tier] || 1.0

    // Parse volume breaks
    const volumeBreaks = pricingConfig.volumeBreaks as any[]

    let subtotal = 0
    const breakdown = []

    // Calculate pricing for each part
    for (const part of parts) {
      // Get routing data
      const routing = await prisma.routing.findUnique({
        where: { id: part.routingId },
        include: {
          steps: {
            include: {
              process: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      })

      if (!routing) {
        return NextResponse.json(
          {
            code: 'ROUTING_NOT_FOUND',
            message: `Routing ${part.routingId} not found`
          },
          { status: 404 }
        )
      }

      // Get material data
      const material = await prisma.material.findUnique({
        where: { id: part.materialId }
      })

      if (!material) {
        return NextResponse.json(
          {
            code: 'MATERIAL_NOT_FOUND',
            message: `Material ${part.materialId} not found`
          },
          { status: 404 }
        )
      }

      // Get finish data (if specified)
      let finish = null
      if (part.finishId) {
        finish = await prisma.finish.findUnique({
          where: { id: part.finishId }
        })

        if (!finish) {
          return NextResponse.json(
            {
              code: 'FINISH_NOT_FOUND',
              message: `Finish ${part.finishId} not found`
            },
            { status: 404 }
          )
        }
      }

      // Calculate base cost from routing steps
      let setupCost = 0
      let processingCost = 0

      for (const step of routing.steps) {
        const stepSetupCost = step.setupTime * (step.hourlyRate / 60) * step.setupTimeMultiplier
        const stepProcessingCost = step.minimumCost * step.runtimeMultiplier * step.complexityMultiplier
        
        setupCost += stepSetupCost
        processingCost += stepProcessingCost
      }

      // Calculate material cost (simplified - would normally need part geometry)
      const estimatedVolume = 1 // Placeholder - would come from CAD analysis
      const materialCost = material.cost * material.markup * estimatedVolume

      // Calculate finishing cost
      let finishingCost = 0
      if (finish) {
        const estimatedSurfaceArea = 10 // Placeholder - would come from CAD analysis
        finishingCost = finish.costPerSqIn * estimatedSurfaceArea
      }

      // Base price per unit
      const basePrice = setupCost / part.quantity + processingCost + materialCost + finishingCost

      // Apply tier multiplier
      const tierAdjustedPrice = basePrice * tierMultiplier

      // Apply volume discounts
      let discountPercent = 0
      for (const volumeBreak of volumeBreaks) {
        if (part.quantity >= volumeBreak.minQuantity) {
          if (!volumeBreak.maxQuantity || part.quantity <= volumeBreak.maxQuantity) {
            discountPercent = Math.max(discountPercent, volumeBreak.discountPercent)
          }
        }
      }

      const discountAmount = (tierAdjustedPrice * discountPercent) / 100
      const finalPricePerUnit = tierAdjustedPrice - discountAmount
      const totalPartPrice = finalPricePerUnit * part.quantity

      subtotal += totalPartPrice

      breakdown.push({
        partId: `${part.routingId}-${part.materialId}-${part.finishId || 'no-finish'}`,
        quantity: part.quantity,
        basePrice: parseFloat(basePrice.toFixed(2)),
        materialCost: parseFloat(materialCost.toFixed(2)),
        finishingCost: parseFloat(finishingCost.toFixed(2)),
        multiplier: tierMultiplier,
        discountPercent,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        finalPricePerUnit: parseFloat(finalPricePerUnit.toFixed(2)),
        totalPrice: parseFloat(totalPartPrice.toFixed(2))
      })
    }

    // Calculate total discounts
    const totalDiscounts = breakdown.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0)

    const result = {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discounts: parseFloat(totalDiscounts.toFixed(2)),
      total: parseFloat(subtotal.toFixed(2)),
      tier,
      breakdown
    }

    return NextResponse.json(result)

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message
        },
        { status: error.statusCode }
      )
    }

    console.error('POST /api/v2/pricing/calculate error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}