import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  paymentStatus: z.string().default('Good Standing')
})

// GET /api/v2/customers - Get customers
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:customers'])(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const active = searchParams.get('active')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (active !== null) {
      where.active = active === 'true'
    }

    // Fetch customers with statistics
    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            rfqs: true,
            quotes: true,
            orders: true
          }
        },
        orders: {
          select: {
            total: true,
            orderDate: true
          },
          where: {
            status: 'Completed'
          },
          orderBy: { orderDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Calculate lifetime value for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const lifetimeValue = await prisma.order.aggregate({
          where: {
            customerId: customer.id,
            status: 'Completed'
          },
          _sum: {
            total: true
          }
        })

        return {
          ...customer,
          lifetimeValue: lifetimeValue._sum.total || 0,
          lastOrderDate: customer.orders[0]?.orderDate || null
        }
      })
    )

    return NextResponse.json(customersWithStats)

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

    console.error('GET /api/v2/customers error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:customers'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateCustomerSchema.safeParse(body)
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

    const { name, email, phone, company, paymentStatus } = validationResult.data

    // Check if customer with email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    })

    if (existingCustomer) {
      return NextResponse.json(
        {
          code: 'CONFLICT',
          message: 'Customer with this email already exists'
        },
        { status: 409 }
      )
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        company,
        paymentStatus,
        createdBy: user.id,
        version: 1
      },
      include: {
        _count: {
          select: {
            rfqs: true,
            quotes: true,
            orders: true
          }
        }
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'Customer',
        entityId: customer.id,
        userId: user.id,
        changes: { name, email, company },
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    })

    return NextResponse.json({
      ...customer,
      lifetimeValue: 0,
      lastOrderDate: null
    }, { status: 201 })

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

    console.error('POST /api/v2/customers error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}