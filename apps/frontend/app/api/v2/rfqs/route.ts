import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const CreateRFQSchema = z.object({
  customerId: z.string(),
  customerNotes: z.string().optional(),
  parts: z.array(z.object({
    partId: z.string(),
    quantity: z.number().positive(),
    tolerance: z.string().default('Standard'),
    leadTime: z.string().default('Standard'),
    notes: z.string().optional()
  })).min(1),
  fileIds: z.array(z.string()).optional()
})

// GET /api/v2/rfqs - Get RFQs
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:rfqs'])(request)

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

    // Fetch RFQs with related data
    const rfqs = await prisma.rFQ.findMany({
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
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true
          }
        }
      },
      orderBy: { submittedDate: 'desc' },
      take: limit
    })

    return NextResponse.json(rfqs)

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

    console.error('GET /api/v2/rfqs error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/rfqs - Create a new RFQ
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:rfqs'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateRFQSchema.safeParse(body)
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

    const { customerId, customerNotes, parts, fileIds } = validationResult.data

    // Generate RFQ number
    const count = await prisma.rFQ.count()
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // Create RFQ in transaction
    const rfq = await prisma.$transaction(async (tx) => {
      // Create RFQ
      const newRFQ = await tx.rFQ.create({
        data: {
          rfqNumber,
          customerId,
          customerNotes,
          status: 'Draft',
          createdBy: user.id,
          version: 1
        }
      })

      // Create RFQ parts
      await tx.rFQPart.createMany({
        data: parts.map(part => ({
          rfqId: newRFQ.id,
          partId: part.partId,
          quantity: part.quantity,
          tolerance: part.tolerance,
          leadTime: part.leadTime,
          notes: part.notes,
          createdBy: user.id,
          version: 1
        }))
      })

      // Connect files if provided
      if (fileIds && fileIds.length > 0) {
        await tx.rFQ.update({
          where: { id: newRFQ.id },
          data: {
            files: {
              connect: fileIds.map(id => ({ id }))
            }
          }
        })
      }

      return newRFQ
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'RFQ',
        entityId: rfq.id,
        userId: user.id,
        changes: { rfqNumber, customerId, partsCount: parts.length },
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    // Fetch complete RFQ data to return
    const completeRFQ = await prisma.rFQ.findUnique({
      where: { id: rfq.id },
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
        },
        files: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileSize: true,
            mimeType: true
          }
        }
      }
    })

    return NextResponse.json(completeRFQ, { status: 201 })

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

    console.error('POST /api/v2/rfqs error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}