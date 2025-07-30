import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../lib/auth'

const FinishSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  costPerSqIn: z.number().min(0, 'Cost must be non-negative'),
  leadTimeDays: z.number().int().min(0, 'Lead time must be non-negative'),
  description: z.string().optional(),
  active: z.boolean().optional().default(true)
})


export const GET = requirePermission('finishes', async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const type = searchParams.get('type')

    // Build Prisma filters
    const where: any = {}
    
    if (active !== null) {
      where.active = active === 'true'
    }
    
    if (type) {
      where.type = type
    }

    const finishes = await prisma.finish.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(finishes)
  } catch (error) {
    console.error('GET /api/v2/finishes error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const POST = requirePermission('finishes', async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const validation = FinishSchema.safeParse(body)
    
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
    
    const { name, type, costPerSqIn, leadTimeDays, description, active } = validation.data
    
    const newFinish = await prisma.finish.create({
      data: {
        name,
        type,
        costPerSqIn,
        leadTimeDays,
        description: description || null,
        active: active ?? true,
        createdBy: user.id,
      }
    })
    
    return NextResponse.json(newFinish, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/finishes error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})