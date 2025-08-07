import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const CreateOrderSchema = z.object({
  quoteId: z.string().optional(),
  customerId: z.string(),
  parts: z.array(z.object({
    partId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number(),
    totalPrice: z.number()
  })).min(1),
  subtotal: z.number(),
  tax: z.number().default(0),
  shipping: z.number().default(0),
  total: z.number(),
  customerNotes: z.string().optional()
})

// GET /api/v2/orders - Get orders
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:orders'])(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: any = {}
    if (customerId) {
      where.customerId = customerId
    }
    if (status) {
      where.status = status
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
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
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            rfq: {
              select: {
                id: true,
                rfqNumber: true
              }
            }
          }
        },
        parts: {
          include: {
            part: {
              select: {
                id: true,
                partName: true,
                fileName: true,
                process: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { orderDate: 'desc' },
      take: limit
    })

    return NextResponse.json(orders)

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

    console.error('GET /api/v2/orders error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:orders'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateOrderSchema.safeParse(body)
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

    const { quoteId, customerId, parts, subtotal, tax, shipping, total, customerNotes } = validationResult.data

    // Generate order number
    const count = await prisma.order.count()
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          quoteId: quoteId || null,
          customerId,
          status: 'Pending',
          subtotal,
          tax,
          shipping,
          total,
          customerNotes,
          createdBy: user.id,
          version: 1
        }
      })

      // Create order parts
      await tx.orderPart.createMany({
        data: parts.map(part => ({
          orderId: newOrder.id,
          partId: part.partId,
          quantity: part.quantity,
          unitPrice: part.unitPrice,
          totalPrice: part.totalPrice,
          status: 'Pending',
          createdBy: user.id,
          version: 1
        }))
      })

      // Update quote status to Approved if quote exists
      if (quoteId) {
        await tx.quote.update({
          where: { id: quoteId },
          data: {
            status: 'Approved',
            approvedDate: new Date()
          }
        })
      }

      return newOrder
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'Order',
        entityId: order.id,
        userId: user.id,
        changes: { orderNumber, total, partsCount: parts.length },
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    // Fetch complete order data to return
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true
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

    return NextResponse.json(completeOrder, { status: 201 })

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

    console.error('POST /api/v2/orders error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}