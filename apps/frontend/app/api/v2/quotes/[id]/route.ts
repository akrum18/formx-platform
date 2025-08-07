import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const UpdateQuoteSchema = z.object({
  status: z.enum(['Draft', 'Sent', 'Approved', 'Rejected', 'Expired']).optional(),
  rejectionReason: z.string().optional(),
  internalNotes: z.array(z.any()).optional()
})

// GET /api/v2/quotes/[id] - Get specific quote
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['read:quotes'])(request)

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            customerSince: true,
            paymentStatus: true
          }
        },
        rfq: {
          select: {
            id: true,
            rfqNumber: true,
            submittedDate: true,
            customerNotes: true
          }
        },
        parts: {
          include: {
            part: {
              include: {
                process: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                },
                material: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                finish: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        },
        files: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileSize: true,
            mimeType: true,
            fileUrl: true
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
      }
    })

    if (!quote) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Quote not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)

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

    console.error(`GET /api/v2/quotes/${params.id} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/quotes/[id] - Update quote
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['update:quotes'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = UpdateQuoteSchema.safeParse(body)
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

    const updates = validationResult.data

    // Check if quote exists
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id }
    })

    if (!existingQuote) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Quote not found'
        },
        { status: 404 }
      )
    }

    // Prepare update data with timestamps for status changes
    const updateData: any = { ...updates }
    
    if (updates.status) {
      switch (updates.status) {
        case 'Sent':
          updateData.sentDate = new Date()
          break
        case 'Approved':
          updateData.approvedDate = new Date()
          break
        case 'Rejected':
          updateData.rejectedDate = new Date()
          break
      }
    }

    // Update quote
    const updatedQuote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
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
        }
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'update',
        entityType: 'Quote',
        entityId: params.id,
        userId: user.id,
        changes: updates,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    return NextResponse.json(updatedQuote)

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

    console.error(`PUT /api/v2/quotes/${params.id} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}