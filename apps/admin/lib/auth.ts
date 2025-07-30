import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"
import { prisma } from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  disabled: boolean
  lastLogin: Date | null
}

export async function verifyToken(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    // Verify JWT token
    let decoded: JWTPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch (jwtError) {
      return null
    }

    // Get current user data from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        disabled: true,
        lastLogin: true,
      }
    })

    if (!user || user.disabled) {
      return null
    }

    return {
      ...user,
      permissions: user.permissions as string[]
    }

  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission) || user.role === "admin"
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await verifyToken(request)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    return handler(request, user, ...args)
  }
}

export function requirePermission(permission: string, handler: (request: NextRequest, user: AuthUser, ...args: any[]) => Promise<Response>) {
  return requireAuth(async (request: NextRequest, user: AuthUser, ...args: any[]) => {
    if (!hasPermission(user, permission)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    return handler(request, user, ...args)
  })
}