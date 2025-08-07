import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Inline auth function
async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header')
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'formx-api',
      audience: 'formx-platform'
    }) as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        disabled: true
      }
    })

    if (!user || user.disabled) {
      throw new Error('User not found or disabled')
    }

    return user
  } catch (error) {
    throw new Error('Authentication failed')
  }
}

// Validation schemas
const AddToCartSchema = z.object({
  partId: z.string(),
  quantity: z.number().int().positive(),
  tolerance: z.string().default('Standard'),
  leadTime: z.string().default('Standard'),
  notes: z.string().optional()
})

// GET /api/v2/cart-simple - Get user's cart
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request)

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
                routing: { select: { id: true, name: true, category: true } },
                material: { select: { id: true, name: true } },
                finish: { select: { id: true, name: true, type: true } }
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
                  routing: { select: { id: true, name: true, category: true } },
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
    console.error('GET /api/v2/cart-simple error:', error)
    return NextResponse.json(
      { error: 'Failed to get cart', details: error.message },
      { status: error.message.includes('auth') ? 401 : 500 }
    )
  }
}

// POST /api/v2/cart-simple - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request)
    const body = await request.json()
    
    // Validate request body
    const validationResult = AddToCartSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
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
        { error: 'Part not found' },
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
              routing: { select: { id: true, name: true, category: true } },
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
              routing: { select: { id: true, name: true, category: true } },
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
    console.error('POST /api/v2/cart-simple error:', error)
    return NextResponse.json(
      { error: 'Failed to add to cart', details: error.message },
      { status: error.message.includes('auth') ? 401 : 500 }
    )
  }
}