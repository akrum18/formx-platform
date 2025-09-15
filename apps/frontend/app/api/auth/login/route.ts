import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@formx/database'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Validation schema for login
const LoginSchema = z.object({
  username: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and form data
    const contentType = request.headers.get('content-type') || ''
    
    let body: any
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = {
        username: formData.get('username'),
        password: formData.get('password')
      }
    } else {
      return NextResponse.json(
        { detail: 'Unsupported content type' },
        { status: 400 }
      )
    }

    // Validate request body
    const validationResult = LoginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { detail: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { username: email, password } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        password: true,
        disabled: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.disabled) {
      return NextResponse.json(
        { detail: 'User account is disabled' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create access token
    const permissions = Array.isArray(user.permissions) ? user.permissions as string[] : []
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions
      },
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'formx-api',
        audience: 'formx-platform'
      }
    )

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Return access token (FastAPI style)
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { detail: 'An unexpected error occurred during login' },
      { status: 500 }
    )
  }
}