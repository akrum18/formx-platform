import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'

const UpdateFinishSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.string().min(1, 'Type is required').optional(),
  costPerSqIn: z.number().min(0, 'Cost must be non-negative').optional(),
  leadTimeDays: z.number().int().min(0, 'Lead time must be non-negative').optional(),
  description: z.string().optional(),
  active: z.boolean().optional()
})


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const finish = await prisma.finish.findUnique({
      where: { id },
    })

    if (!finish) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Finish not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(finish)
  } catch (error) {
    console.error('GET /api/v2/finishes/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = UpdateFinishSchema.safeParse(body)
    
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

    const updateData: any = { ...validation.data }
    if (updateData.description === '') {
      updateData.description = null
    }

    const updatedFinish = await prisma.finish.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedFinish)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Finish not found' },
        { status: 404 }
      )
    }
    
    console.error('PUT /api/v2/finishes/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Soft delete by setting active to false
    await prisma.finish.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ message: 'Finish deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Finish not found' },
        { status: 404 }
      )
    }
    
    console.error('DELETE /api/v2/finishes/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}