import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Define which routes require authentication
const protectedRoutes = ["/dashboard", "/quote", "/configure", "/cart", "/order", "/rfq"]

// Define which routes are only for non-authenticated users
const authRoutes = ["/auth/login", "/auth/signup", "/auth/forgot-password"]

function isValidToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET, {
      issuer: 'formx-api',
      audience: 'formx-platform'
    })
    return true
  } catch (error) {
    return false
  }
}

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth_token")?.value
  const isAuthenticated = authToken ? isValidToken(authToken) : false
  const { pathname } = request.nextUrl

  // Check if the route is protected and user is not authenticated
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  if (isProtectedRoute && !isAuthenticated) {
    // Clear invalid tokens
    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    if (authToken) {
      response.cookies.set("auth_token", "", { maxAge: 0, path: "/" })
      response.cookies.set("user_type", "", { maxAge: 0, path: "/" })
    }
    response.url = new URL("/auth/login", request.url).href
    const url = new URL(response.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  // Check if the route is for non-authenticated users and user is authenticated
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Clear invalid tokens for non-protected routes
  if (authToken && !isAuthenticated) {
    const response = NextResponse.next()
    response.cookies.set("auth_token", "", { maxAge: 0, path: "/" })
    response.cookies.set("user_type", "", { maxAge: 0, path: "/" })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
