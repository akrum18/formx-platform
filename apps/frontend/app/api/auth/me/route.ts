import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  exp: number;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { detail: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token
    let decoded: JWTPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'formx-api',
        audience: 'formx-platform'
      }) as JWTPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { detail: 'Access token has expired' },
          { status: 401 }
        )
      } else if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { detail: 'Invalid access token' },
          { status: 401 }
        )
      } else {
        return NextResponse.json(
          { detail: 'Token verification failed' },
          { status: 401 }
        )
      }
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        disabled: true,
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            phone: true
          }
        }
      }
    })

    if (!user || user.disabled) {
      return NextResponse.json(
        { detail: 'User not found or disabled' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
      company: user.customer?.company || '',
      customer: user.customer
    })

  } catch (error) {
    console.error('Auth me API error:', error)
    return NextResponse.json(
      { detail: 'An unexpected error occurred' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}