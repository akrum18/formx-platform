import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'

const MaterialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  cost: z.number().min(0, 'Cost must be non-negative'),
  markup: z.number().min(0, 'Markup must be non-negative'),
  density: z.number().min(0, 'Density must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  processIds: z.array(z.string()).optional(),
  active: z.boolean().optional().default(true)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const processId = searchParams.get('processId')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause
    const where: any = {}
    if (active !== null) {
      where.active = active === 'true'
    }
    if (processId) {
      where.processes = {
        some: {
          id: processId
        }
      }
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy,
      include: {
        processes: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Transform to match expected format
    const response = materials.map(material => ({
      ...material,
      processes: material.processes.map(p => p.name),
      processIds: material.processes.map(p => p.id),
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString()
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/materials error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = MaterialSchema.safeParse(body)
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

    const { processIds = [], ...materialData } = validation.data

    const newMaterial = await prisma.material.create({
      data: {
        ...materialData,
        createdBy: 'system', // TODO: Get from JWT token
        processes: processIds.length > 0 ? {
          connect: processIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        processes: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Transform to match expected format
    const response = {
      ...newMaterial,
      processes: newMaterial.processes.map(p => p.name),
      processIds: newMaterial.processes.map(p => p.id),
      createdAt: newMaterial.createdAt.toISOString(),
      updatedAt: newMaterial.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/materials error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}