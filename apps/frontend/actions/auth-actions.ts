"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient()
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
    return {
      success: false,
      message: "An unexpected error occurred during login.",
    }
  } finally {
    await prisma.$disconnect()
  }
}

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const company = formData.get("company") as string
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, company, password }),
    })

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = "Registration failed";
      
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Handle validation errors array
          errorMessage = errorData.detail.map(err => err.msg || err.message || String(err)).join(', ');
        } else if (typeof errorData.detail === 'object') {
          // Handle single validation error object
          errorMessage = errorData.detail.msg || errorData.detail.message || "Validation error";
        }
      }
      
      return {
        success: false,
        message: errorMessage,
      }
    }

    const data = await response.json()
    // Assuming registration directly logs in and returns an access token
    // If not, you'd need to call loginUser here or redirect to login page
    const accessToken = data.access_token // Assuming backend returns access_token on successful registration

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
    const response = await fetch(`${API_BASE_URL}/api/auth/partner/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, partner_code: partnerCode }), // Ensure partner_code matches backend expected field
    })

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = "Partner login failed";
      
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Handle validation errors array
          errorMessage = errorData.detail.map(err => err.msg || err.message || String(err)).join(', ');
        } else if (typeof errorData.detail === 'object') {
          // Handle single validation error object
          errorMessage = errorData.detail.msg || errorData.detail.message || "Validation error";
        }
      }
      
      return {
        success: false,
        message: errorMessage,
      }
    }

    const data = await response.json()
    const accessToken = data.access_token

    const cookieStore = await cookies()
    cookieStore.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })
    cookieStore.set("user_type", "partner", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    redirect("/channel-partner") // Partners always go to partner portal

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