import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthError } from '../../auth-server'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema
const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  tolerance: z.string().optional(),
  leadTime: z.string().optional(),
  notes: z.string().optional()
})

// PUT /api/v2/cart/[itemId] - Update cart item
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['update:cart'])(request)

    const body = await request.json()
    
    // Validate request body
    const validationResult = UpdateCartItemSchema.safeParse(body)
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

    const updates = validationResult.data

    // Find cart item and verify ownership
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: params.itemId },
      include: {
        cart: true,
        part: {
          include: {
            process: { select: { id: true, name: true, category: true } },
            material: { select: { id: true, name: true } },
            finish: { select: { id: true, name: true, type: true } }
          }
        }
      }
    })

    if (!cartItem) {
      return NextResponse.json(
        {
          code: 'CART_ITEM_NOT_FOUND',
          message: 'Cart item not found'
        },
        { status: 404 }
      )
    }

    // Verify user owns this cart
    if (cartItem.cart.userId !== user.id) {
      return NextResponse.json(
        {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify this cart item'
        },
        { status: 403 }
      )
    }

    // Update cart item
    const updatedItem = await prisma.cartItem.update({
      where: { id: params.itemId },
      data: {
        ...updates,
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

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cartItem.cart.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json(updatedItem)

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

    console.error(`PUT /api/v2/cart/${params.itemId} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/cart/[itemId] - Remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(['delete:cart'])(request)

    // Find cart item and verify ownership
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: params.itemId },
      include: {
        cart: true
      }
    })

    if (!cartItem) {
      return NextResponse.json(
        {
          code: 'CART_ITEM_NOT_FOUND',
          message: 'Cart item not found'
        },
        { status: 404 }
      )
    }

    // Verify user owns this cart
    if (cartItem.cart.userId !== user.id) {
      return NextResponse.json(
        {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify this cart item'
        },
        { status: 403 }
      )
    }

    // Delete cart item
    await prisma.cartItem.delete({
      where: { id: params.itemId }
    })

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cartItem.cart.id },
      data: { updatedAt: new Date() }
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

    console.error(`DELETE /api/v2/cart/${params.itemId} error:`, error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}