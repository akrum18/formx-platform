import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@formx/database'
import { requireAuth, AuthError } from '@formx/auth'

// GET /api/v2/parts - Get parts inventory
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:parts', 'create:quotes'])(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const processId = searchParams.get('processId')
    const materialId = searchParams.get('materialId')
    const active = searchParams.get('active')

    // Build where clause
    const where: any = {}
    if (processId) {
      where.processId = processId
    }
    if (materialId) {
      where.materialId = materialId
    }
    if (active !== null) {
      where.process = {
        active: active === 'true'
      }
    }

    // Fetch parts with related data
    const parts = await prisma.part.findMany({
      where,
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
            density: true,
            unit: true
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
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit results
    })

    return NextResponse.json(parts)

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

    console.error('GET /api/v2/parts error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/parts - Create a new part
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:parts'])(request)

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['partName', 'processId', 'materialId', 'quantity', 'fileName', 'fileSize', 'fileType']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: { missingFields }
        },
        { status: 400 }
      )
    }

    const {
      partName,
      processId,
      materialId,
      finishId,
      quantity,
      tolerance,
      fileName,
      fileSize,
      fileType,
      fileUrl
    } = body

    // Create part in database
    const part = await prisma.part.create({
      data: {
        partName,
        processId,
        materialId,
        finishId: finishId || null,
        quantity: parseInt(quantity),
        tolerance: tolerance || 'Standard',
        fileName,
        fileSize: parseInt(fileSize),
        fileType,
        fileUrl,
        createdBy: user.id,
        version: 1
      },
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
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'Part',
        entityId: part.id,
        userId: user.id,
        changes: part,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    return NextResponse.json(part, { status: 201 })

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

    console.error('POST /api/v2/parts error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}