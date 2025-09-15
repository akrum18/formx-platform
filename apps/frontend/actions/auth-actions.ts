"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from '@formx/database'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Validation schema for login
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string

  try {
    console.log('Attempting login for:', email)
    
    // Validate input
    const validationResult = LoginSchema.safeParse({ email, password })
    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.errors.map(e => e.message).join(', ')
      }
    }

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
      return {
        success: false,
        message: 'Invalid email or password'
      }
    }

    if (user.disabled) {
      return {
        success: false,
        message: 'User account is disabled'
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password'
      }
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

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    cookieStore.set("user_type", "user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    console.log('Login successful for:', email)

    let redirectTo = "/dashboard"
    if (callbackUrl && callbackUrl.trim() !== "") {
      redirectTo = callbackUrl
    }
    
    redirect(redirectTo)

  } catch (error) {
    console.error("Error during login:", error)
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Login error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }

    return {
      success: false,
      message: "An unexpected error occurred during login. Please try again.",
    }
  }
}

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const company = formData.get("company") as string
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string

  try {
    // Validate input
    const validationSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters')
    })

    const validationResult = validationSchema.safeParse({ name, email, password })
    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.errors.map(e => e.message).join(', ')
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists'
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'user',
        permissions: [],
        disabled: false
      }
    })

    // Create customer record if company provided
    if (company && company.trim() !== "") {
      await prisma.customer.create({
        data: {
          name,
          company,
          email,
          userId: user.id
        }
      })
    }

    // Create access token
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: []
      },
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'formx-api',
        audience: 'formx-platform'
      }
    )

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })
    cookieStore.set("user_type", "user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    console.log('Registration successful for:', email)

    let redirectTo = "/dashboard"
    if (callbackUrl && callbackUrl.trim() !== "") {
      redirectTo = callbackUrl
    }
    redirect(redirectTo)

  } catch (error) {
    console.error("Error during registration:", error)
    return {
      success: false,
      message: "An unexpected error occurred during registration.",
    }
  }
}

export async function loginPartner(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const partnerCode = formData.get("partnerCode") as string

  try {
    // For now, return an error message since partner login is not fully implemented
    return {
      success: false,
      message: "Partner login is not yet implemented. Please contact support."
    }
  } catch (error) {
    console.error("Error during partner login:", error)
    return {
      success: false,
      message: "An unexpected error occurred during partner login.",
    }
  }
}

export async function logoutUser() {
  const cookieStore = await cookies()

  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })

  cookieStore.set("user_type", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })

  // Redirect to login page after logout
  redirect("/auth/login")
}

// This getCurrentUser is likely not needed here anymore as lib/auth.ts handles it
// However, if other parts of auth-actions rely on it for server-side logic,
// it should call the getCurrentUser from lib/auth.ts
// For now, I'll remove the mock implementation here.
export async function getCurrentUser() {
  return null; // This function should defer to lib/auth.ts or be removed if not used.
}