import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const UpdateRFQSchema = z.object({
  status: z.enum(['Draft', 'Submitted', 'In Review', 'Quoted', 'Rejected']).optional(),
  customerNotes: z.string().optional(),
  internalNotes: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    author: z.string(),
    date: z.string()
  })).optional(),
  estimatedCost: z.number().optional()
})

// GET /api/v2/rfqs/[id] - Get specific RFQ
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['read:rfqs'])(request)

    const rfq = await prisma.rFQ.findUnique({
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
        parts: {
          include: {
            part: {
              include: {
                process: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    setupTime: true,
                    hourlyRate: true,
                    minimumCost: true,
                    complexityMultiplier: true
                  }
                },
                material: {
                  select: {
                    id: true,
                    name: true,
                    cost: true,
                    markup: true,
                    density: true
                  }
                },
                finish: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    costPerSqIn: true,
                    leadTimeDays: true
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
            fileUrl: true,
            createdAt: true
          }
        },
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            tier: true,
            validUntil: true,
            createdAt: true
          }
        }
      }
    })

    if (!rfq) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'RFQ not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(rfq)

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

    console.error(`GET /api/v2/rfqs/${params.id} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/rfqs/[id] - Update RFQ
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['update:rfqs'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = UpdateRFQSchema.safeParse(body)
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

    // Check if RFQ exists
    const existingRFQ = await prisma.rFQ.findUnique({
      where: { id: params.id }
    })

    if (!existingRFQ) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'RFQ not found'
        },
        { status: 404 }
      )
    }

    // Update RFQ
    const updatedRFQ = await prisma.rFQ.update({
      where: { id: params.id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
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

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'update',
        entityType: 'RFQ',
        entityId: params.id,
        userId: user.id,
        changes: updates,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    return NextResponse.json(updatedRFQ)

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

    console.error(`PUT /api/v2/rfqs/${params.id} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/rfqs/[id] - Delete RFQ
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['delete:rfqs'])(request)

    // Check if RFQ exists
    const existingRFQ = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        quotes: true
      }
    })

    if (!existingRFQ) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'RFQ not found'
        },
        { status: 404 }
      )
    }

    // Don't allow deletion if there are quotes
    if (existingRFQ.quotes.length > 0) {
      return NextResponse.json(
        {
          code: 'CONFLICT',
          message: 'Cannot delete RFQ with existing quotes'
        },
        { status: 409 }
      )
    }

    // Delete RFQ (cascade will handle parts)
    await prisma.rFQ.delete({
      where: { id: params.id }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'delete',
        entityType: 'RFQ',
        entityId: params.id,
        userId: user.id,
        changes: { rfqNumber: existingRFQ.rfqNumber },
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    return NextResponse.json({ success: true })

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

    console.error(`DELETE /api/v2/rfqs/${params.id} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}