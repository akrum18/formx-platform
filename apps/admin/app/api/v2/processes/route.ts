import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../lib/auth'

const ProcessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  setupTime: z.number().min(0, 'Setup time must be non-negative'),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative'),
  minimumCost: z.number().min(0, 'Minimum cost must be non-negative'),
  complexityMultiplier: z.number().min(0.1, 'Complexity multiplier must be at least 0.1'),
  active: z.boolean().optional().default(true)
})

export const GET = requirePermission('processes', async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause
    const where: any = {}
    if (active !== null) {
      where.active = active === 'true'
    }
    if (category) {
      where.category = category
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const processes = await prisma.process.findMany({
      where,
      orderBy,
      include: {
        materials: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Transform to match expected format
    const response = processes.map(process => ({
      ...process,
      materials: process.materials.map(m => m.name),
      materialIds: process.materials.map(m => m.id),
      createdAt: process.createdAt.toISOString(),
      updatedAt: process.updatedAt.toISOString()
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/processes error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const POST = requirePermission('processes', async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    
    const validation = ProcessSchema.safeParse(body)
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

    const processData = validation.data

    const newProcess = await prisma.process.create({
      data: {
        ...processData,
        createdBy: user.id
      },
      include: {
        materials: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Transform to match expected format
    const response = {
      ...newProcess,
      materials: newProcess.materials.map(m => m.name),
      materialIds: newProcess.materials.map(m => m.id),
      createdAt: newProcess.createdAt.toISOString(),
      updatedAt: newProcess.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/processes error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})