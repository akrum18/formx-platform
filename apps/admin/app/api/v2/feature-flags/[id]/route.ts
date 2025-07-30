import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../../lib/auth'

const UpdateFeatureFlagSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  category: z.enum(['Processes', 'Finishes', 'Pricing', 'Experimental']).optional(),
})


export const GET = requirePermission('features', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    
    const flag = await prisma.featureFlag.findUnique({
      where: { id }
    })
    
    if (!flag) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Feature flag not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(flag)
  } catch (error) {
    console.error(`GET /api/v2/feature-flags/[id] error:`, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const PUT = requirePermission('features', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = UpdateFeatureFlagSchema.safeParse(body)
    
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
    
    const updatedFlag = await prisma.featureFlag.update({
      where: { id },
      data: validation.data
    })
    
    return NextResponse.json(updatedFlag)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Feature flag not found' },
        { status: 404 }
      )
    }
    
    console.error(`PUT /api/v2/feature-flags/[id] error:`, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const DELETE = requirePermission('features', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    
    await prisma.featureFlag.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Feature flag deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Feature flag not found' },
        { status: 404 }
      )
    }
    
    console.error(`DELETE /api/v2/feature-flags/[id] error:`, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})