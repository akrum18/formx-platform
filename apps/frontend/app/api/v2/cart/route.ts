import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const AddToCartSchema = z.object({
  partId: z.string(),
  quantity: z.number().int().positive(),
  tolerance: z.string().default('Standard'),
  leadTime: z.string().default('Standard'),
  notes: z.string().optional()
})

const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  tolerance: z.string().optional(),
  leadTime: z.string().optional(),
  notes: z.string().optional()
})

// GET /api/v2/cart - Get user's cart
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['read:cart'])(request)

    // Find or create user's active cart
    let cart = await prisma.cart.findFirst({
      where: {
        userId: user.id,
        active: true
      },
      include: {
        items: {
          include: {
            part: {
              include: {
                process: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                },
                material: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                finish: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: user.id,
          active: true,
          version: 1
        },
        include: {
          items: {
            include: {
              part: {
                include: {
                  process: { select: { id: true, name: true, category: true } },
                  material: { select: { id: true, name: true } },
                  finish: { select: { id: true, name: true, type: true } }
                }
              }
            }
          }
        }
      })
    }

    return NextResponse.json(cart)

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

    console.error('GET /api/v2/cart error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['create:cart'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = AddToCartSchema.safeParse(body)
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

    const { partId, quantity, tolerance, leadTime, notes } = validationResult.data

    // Verify part exists
    const part = await prisma.part.findUnique({
      where: { id: partId }
    })

    if (!part) {
      return NextResponse.json(
        {
          code: 'PART_NOT_FOUND',
          message: 'Part not found'
        },
        { status: 404 }
      )
    }

    // Find or create user's active cart
    let cart = await prisma.cart.findFirst({
      where: {
        userId: user.id,
        active: true
      }
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: user.id,
          active: true,
          version: 1
        }
      })
    }

    // Check if part already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_partId: {
          cartId: cart.id,
          partId: partId
        }
      }
    })

    let cartItem
    if (existingItem) {
      // Update existing item
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          tolerance,
          leadTime,
          notes,
          updatedAt: new Date()
        },
        include: {
          part: {
            include: {
              process: { select: { id: true, name: true, category: true } },
              material: { select: { id: true, name: true } },
              finish: { select: { id: true, name: true, type: true } }
            }
          }
        }
      })
    } else {
      // Create new item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          partId,
          quantity,
          tolerance,
          leadTime,
          notes,
          version: 1
        },
        include: {
          part: {
            include: {
              process: { select: { id: true, name: true, category: true } },
              material: { select: { id: true, name: true } },
              finish: { select: { id: true, name: true, type: true } }
            }
          }
        }
      })
    }

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json(cartItem, { status: 201 })

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

    console.error('POST /api/v2/cart error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/cart - Clear cart
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(['delete:cart'])(request)

    // Find user's active cart
    const cart = await prisma.cart.findFirst({
      where: {
        userId: user.id,
        active: true
      }
    })

    if (!cart) {
      return NextResponse.json({ success: true })
    }

    // Delete all items (cascade will handle this)
    await prisma.cart.update({
      where: { id: cart.id },
      data: { active: false }
    })

    // Create new empty cart
    await prisma.cart.create({
      data: {
        userId: user.id,
        active: true,
        version: 1
      }
    })

    return NextResponse.json({ success: true })

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

    console.error('DELETE /api/v2/cart error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}