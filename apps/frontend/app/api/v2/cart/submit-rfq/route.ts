import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema
const SubmitRFQSchema = z.object({
  customerNotes: z.string().optional(),
  customerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    company: z.string().optional()
  }).optional()
})

// POST /api/v2/cart/submit-rfq - Convert cart to RFQ
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:rfqs'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = SubmitRFQSchema.safeParse(body)
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

    const { customerNotes, customerInfo } = validationResult.data

    // Find user's active cart
    const cart = await prisma.cart.findFirst({
      where: {
        userId: user.id,
        active: true
      },
      include: {
        items: {
          include: {
            part: true
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        {
          code: 'EMPTY_CART',
          message: 'Cannot submit RFQ with empty cart'
        },
        { status: 400 }
      )
    }

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { email: customerInfo?.email || user.email }
    })

    if (!customer) {
      // Create customer if doesn't exist
      customer = await prisma.customer.create({
        data: {
          name: customerInfo?.name || user.name,
          email: customerInfo?.email || user.email,
          phone: customerInfo?.phone,
          company: customerInfo?.company,
          paymentStatus: 'Good Standing',
          createdBy: user.id,
          version: 1
        }
      })
    }

    // Generate RFQ number
    const count = await prisma.rFQ.count()
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // Create RFQ in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create RFQ
      const rfq = await tx.rFQ.create({
        data: {
          rfqNumber,
          customerId: customer.id,
          status: 'Submitted',
          customerNotes,
          createdBy: user.id,
          version: 1
        }
      })

      // Create RFQ parts from cart items
      const rfqParts = await Promise.all(
        cart.items.map(item => 
          tx.rFQPart.create({
            data: {
              rfqId: rfq.id,
              partId: item.partId,
              quantity: item.quantity,
              tolerance: item.tolerance,
              leadTime: item.leadTime,
              notes: item.notes,
              createdBy: user.id,
              version: 1
            }
          })
        )
      )

      // Deactivate cart after successful RFQ creation
      await tx.cart.update({
        where: { id: cart.id },
        data: { active: false }
      })

      // Create new empty cart for user
      await tx.cart.create({
        data: {
          userId: user.id,
          active: true,
          version: 1
        }
      })

      return { rfq, rfqParts }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'RFQ',
        entityId: result.rfq.id,
        userId: user.id,
        changes: {
          rfqNumber: result.rfq.rfqNumber,
          customerId: customer.id,
          partsCount: cart.items.length,
          source: 'cart_submission'
        },
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    // Fetch complete RFQ data to return
    const completeRFQ = await prisma.rFQ.findUnique({
      where: { id: result.rfq.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        },
        parts: {
          include: {
            part: {
              include: {
                process: { select: { id: true, name: true, category: true } },
                material: { select: { id: true, name: true } },
                finish: { select: { id: true, name: true, type: true } }
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      rfq: completeRFQ,
      message: `RFQ ${result.rfq.rfqNumber} created successfully from cart`,
      cartItemsCount: cart.items.length
    }, { status: 201 })

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

    console.error('POST /api/v2/cart/submit-rfq error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}