import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Simple inline auth for testing
async function verifyToken(token: string) {
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
    throw new Error('Auth failed')
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const user = await verifyToken(token)

    return NextResponse.json({
      message: 'Test endpoint working!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 401 }
    )
  }
}