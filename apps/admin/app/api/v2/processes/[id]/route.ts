import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { requirePermission } from '../../../../../lib/auth'

const UpdateProcessSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  setupTime: z.number().min(0, 'Setup time must be non-negative').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative').optional(),
  minimumCost: z.number().min(0, 'Minimum cost must be non-negative').optional(),
  complexityMultiplier: z.number().min(0.1, 'Complexity multiplier must be at least 0.1').optional(),
  active: z.boolean().optional()
})

export const GET = requirePermission('processes', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    
    const process = await prisma.process.findUnique({
      where: { id },
      include: {
        materials: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!process) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Process not found' },
        { status: 404 }
      )
    }

    // Transform to match expected format
    const response = {
      ...process,
      materials: process.materials.map(m => m.name),
      materialIds: process.materials.map(m => m.id),
      createdAt: process.createdAt.toISOString(),
      updatedAt: process.updatedAt.toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/processes/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const PUT = requirePermission('processes', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    
    const validation = UpdateProcessSchema.safeParse(body)
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

    const updateData = validation.data

    const updatedProcess = await prisma.process.update({
      where: { id },
      data: updateData,
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
      ...updatedProcess,
      materials: updatedProcess.materials.map(m => m.name),
      materialIds: updatedProcess.materials.map(m => m.id),
      createdAt: updatedProcess.createdAt.toISOString(),
      updatedAt: updatedProcess.updatedAt.toISOString()
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Process not found' },
        { status: 404 }
      )
    }
    
    console.error('PUT /api/v2/processes/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const DELETE = requirePermission('processes', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    await prisma.process.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Process deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Process not found' },
        { status: 404 }
      )
    }
    
    console.error('DELETE /api/v2/processes/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})