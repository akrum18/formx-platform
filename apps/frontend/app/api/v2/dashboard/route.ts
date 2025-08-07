import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'

const prisma = new PrismaClient()

// GET /api/v2/dashboard - Get dashboard data for customer
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:dashboard'])(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        {
          code: 'MISSING_PARAMETER',
          message: 'customerId is required'
        },
        { status: 400 }
      )
    }

    // Get current date for filtering
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch dashboard statistics
    const [
      rfqStats,
      quoteStats,
      orderStats,
      recentRFQs,
      recentQuotes,
      recentOrders
    ] = await Promise.all([
      // RFQ stats
      prisma.rFQ.findMany({
        where: { customerId },
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      }),
      
      // Quote stats
      prisma.quote.findMany({
        where: { customerId },
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true
        }
      }),
      
      // Order stats
      prisma.order.findMany({
        where: { customerId },
        select: {
          id: true,
          status: true,
          total: true,
          orderDate: true
        }
      }),
      
      // Recent RFQs
      prisma.rFQ.findMany({
        where: { customerId },
        include: {
          _count: {
            select: {
              parts: true
            }
          }
        },
        orderBy: { submittedDate: 'desc' },
        take: 5
      }),
      
      // Recent Quotes
      prisma.quote.findMany({
        where: { customerId },
        include: {
          rfq: {
            select: {
              rfqNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Recent Orders
      prisma.order.findMany({
        where: { customerId },
        include: {
          quote: {
            select: {
              quoteNumber: true
            }
          }
        },
        orderBy: { orderDate: 'desc' },
        take: 5
      })
    ])

    // Calculate statistics
    const stats = {
      activeRfqs: rfqStats.filter(rfq => ['Draft', 'Submitted', 'In Review'].includes(rfq.status)).length,
      rfqsThisMonth: rfqStats.filter(rfq => rfq.createdAt >= startOfMonth).length,
      pendingQuotes: quoteStats.filter(quote => quote.status === 'Sent').length,
      quotesThisMonth: quoteStats.filter(quote => quote.createdAt >= startOfMonth).length,
      activeOrders: orderStats.filter(order => ['Pending', 'In Production'].includes(order.status)).length,
      ordersThisMonth: orderStats.filter(order => order.orderDate >= startOfMonth).length,
      completedOrders: orderStats.filter(order => order.status === 'Completed').length,
      completedThisMonth: orderStats.filter(order => 
        order.status === 'Completed' && order.orderDate >= startOfMonth
      ).length
    }

    // Format recent items for dashboard
    const dashboardData = {
      stats,
      rfqs: recentRFQs.map(rfq => ({
        id: rfq.id,
        name: rfq.rfqNumber,
        date: rfq.submittedDate.toISOString(),
        parts: rfq._count.parts,
        status: rfq.status
      })),
      quotes: recentQuotes.map(quote => ({
        id: quote.id,
        name: quote.rfq?.rfqNumber || quote.quoteNumber,
        date: quote.createdAt.toISOString(),
        total: quote.total,
        status: quote.status
      })),
      orders: recentOrders.map(order => ({
        id: order.id,
        name: order.quote?.quoteNumber || order.orderNumber,
        date: order.orderDate.toISOString(),
        total: order.total,
        status: order.status
      }))
    }

    return NextResponse.json(dashboardData)

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

    console.error('GET /api/v2/dashboard error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}