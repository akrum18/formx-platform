import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const CreateQuoteSchema = z.object({
  rfqId: z.string(),
  customerId: z.string(),
  tier: z.enum(['economy', 'standard', 'rush']),
  validDays: z.number().default(30),
  parts: z.array(z.object({
    partId: z.string(),
    quantity: z.number().positive(),
    basePrice: z.number(),
    materialCost: z.number(),
    finishingCost: z.number(),
    multiplier: z.number(),
    discountPercent: z.number().default(0),
    discountAmount: z.number().default(0),
    finalPricePerUnit: z.number(),
    totalPrice: z.number()
  })).min(1),
  subtotal: z.number(),
  discounts: z.number().default(0),
  total: z.number(),
  breakdown: z.any().optional(),
  internalNotes: z.array(z.any()).optional()
})

// GET /api/v2/quotes - Get quotes
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:quotes'])(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const rfqId = searchParams.get('rfqId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: any = {}
    if (customerId) {
      where.customerId = customerId
    }
    if (status) {
      where.status = status
    }
    if (rfqId) {
      where.rfqId = rfqId
    }

    // Fetch quotes with related data
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        },
        rfq: {
          select: {
            id: true,
            rfqNumber: true,
            submittedDate: true
          }
        },
        parts: {
          include: {
            part: {
              select: {
                id: true,
                partName: true,
                fileName: true
              }
            }
          }
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            orderDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json(quotes)

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

    console.error('GET /api/v2/quotes error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/quotes - Create a new quote
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:quotes'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateQuoteSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { rfqId, customerId, tier, validDays, parts, subtotal, discounts, total, breakdown, internalNotes } = validationResult.data

    // Generate quote number
    const count = await prisma.quote.count()
    const quoteNumber = `QUO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // Calculate valid until date
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    // Create quote in transaction
    const quote = await prisma.$transaction(async (tx) => {
      // Create quote
      const newQuote = await tx.quote.create({
        data: {
          quoteNumber,
          rfqId,
          customerId,
          status: 'Draft',
          subtotal,
          discounts,
          total,
          tier,
          validUntil,
          breakdown: breakdown || {},
          internalNotes: internalNotes || [],
          createdBy: user.id,
          version: 1
        }
      })

      // Create quote parts
      await tx.quotePart.createMany({
        data: parts.map(part => ({
          quoteId: newQuote.id,
          partId: part.partId,
          quantity: part.quantity,
          basePrice: part.basePrice,
          materialCost: part.materialCost,
          finishingCost: part.finishingCost,
          multiplier: part.multiplier,
          discountPercent: part.discountPercent,
          discountAmount: part.discountAmount,
          finalPricePerUnit: part.finalPricePerUnit,
          totalPrice: part.totalPrice,
          createdBy: user.id,
          version: 1
        }))
      })

      // Update RFQ status to Quoted
      await tx.rFQ.update({
        where: { id: rfqId },
        data: {
          status: 'Quoted',
          estimatedCost: total
        }
      })

      return newQuote
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'Quote',
        entityId: quote.id,
        userId: user.id,
        changes: { quoteNumber, total, tier, partsCount: parts.length },
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    // Fetch complete quote data to return
    const completeQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        },
        rfq: {
          select: {
            id: true,
            rfqNumber: true
          }
        },
        parts: {
          include: {
            part: {
              select: {
                id: true,
                partName: true,
                fileName: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(completeQuote, { status: 201 })

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

    console.error('POST /api/v2/quotes error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}