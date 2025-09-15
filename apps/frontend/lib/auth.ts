import { cookies } from "next/headers"
import { prisma } from '@formx/database'
import jwt from 'jsonwebtoken'
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  exp: number;
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth_token")
  const userType = cookieStore.get("user_type")

  console.log("getCurrentUser - Auth token exists:", !!authToken?.value)
  console.log("getCurrentUser - User type:", userType?.value)

  if (!authToken?.value || !userType?.value) {
    console.log("getCurrentUser - No auth token or user type")
    return null
  }

  try {
    // Decode JWT token directly instead of making HTTP request
    let decoded: JWTPayload
    try {
      decoded = jwt.verify(authToken.value, JWT_SECRET, {
        issuer: 'formx-api',
        audience: 'formx-platform'
      }) as JWTPayload
    } catch (error) {
      console.log("getCurrentUser - Invalid token:", error)
      return null
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
      console.log("getCurrentUser - User not found or disabled")
      return null
    }

    console.log("getCurrentUser - Found user:", user.email)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.customer?.company || '',
      type: userType.value as "user" | "partner",
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
      customer: user.customer
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}