import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'

const FeatureFlagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100),
  category: z.enum(['Processes', 'Finishes', 'Pricing', 'Experimental']),
})


export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const enabled = searchParams.get('enabled')

    // Build Prisma filters
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (enabled !== null) {
      // Only filter if explicitly set
      if (enabled === 'true' || enabled === 'false') {
        where.enabled = enabled === 'true'
      }
    }

    const featureFlags = await prisma.featureFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(featureFlags)
  } catch (error) {
    console.error('GET /api/v2/feature-flags error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = FeatureFlagSchema.safeParse(body)

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

    const { name, description, enabled, rolloutPercentage, category } = validation.data

    // Generate a slug id from name (if not using cuid default)
    // const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-')

    const newFlag = await prisma.featureFlag.create({
      data: {
        name,
        description,
        enabled,
        rolloutPercentage,
        category,
        // id // optionally include if not using cuid default
      }
    })

    return NextResponse.json(newFlag, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/feature-flags error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
}
