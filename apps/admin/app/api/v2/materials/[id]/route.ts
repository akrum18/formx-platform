import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../../lib/auth'

const UpdateMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  markup: z.number().min(0, 'Markup must be non-negative').optional(),
  density: z.number().min(0, 'Density must be positive').optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  processIds: z.array(z.string()).optional(),
  active: z.boolean().optional()
})

export const GET = requirePermission('materials', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        processes: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!material) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Material not found' },
        { status: 404 }
      )
    }

    // Transform to match expected format
    const response = {
      ...material,
      processes: material.processes.map(p => p.name),
      processIds: material.processes.map(p => p.id),
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/materials/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const PUT = requirePermission('materials', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    
    const validation = UpdateMaterialSchema.safeParse(body)
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

    const { processIds, ...updateData } = validation.data

    // Start with the basic update
    let updatePayload: any = { ...updateData }
    
    // Handle process relationships if provided
    if (processIds !== undefined) {
      // First disconnect all existing processes, then connect new ones
      updatePayload.processes = {
        set: processIds.map(id => ({ id }))
      }
    }

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: updatePayload,
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
      ...updatedMaterial,
      processes: updatedMaterial.processes.map(p => p.name),
      processIds: updatedMaterial.processes.map(p => p.id),
      createdAt: updatedMaterial.createdAt.toISOString(),
      updatedAt: updatedMaterial.updatedAt.toISOString()
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Material not found' },
        { status: 404 }
      )
    }
    
    console.error('PUT /api/v2/materials/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const DELETE = requirePermission('materials', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    await prisma.material.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Material deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Material not found' },
        { status: 404 }
      )
    }
    
    console.error('DELETE /api/v2/materials/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})