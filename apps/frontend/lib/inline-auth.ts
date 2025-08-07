import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Inline auth function for API routes
export async function authenticateUser(request: NextRequest) {
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