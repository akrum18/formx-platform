import jwt from 'jsonwebtoken'
import { prisma } from '@formx/database'

// JWT Payload interface
export interface JWTPayload {
  sub: string;          // User ID
  email: string;
  role: string;
  permissions: string[];
  exp: number;          // Expiration timestamp
}

// Custom error class
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// Auth configuration
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

// Auth service
export class AuthService {
  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'formx-api',
        audience: 'formx-platform'
      }) as JWTPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('TOKEN_EXPIRED', 'Access token has expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('INVALID_TOKEN', 'Invalid access token')
      } else {
        throw new AuthError('TOKEN_VERIFICATION_FAILED', 'Token verification failed')
      }
    }
  }

  static async getCurrentUser(token: string) {
    try {
      const payload = await this.verifyAccessToken(token)
      
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
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
        throw new AuthError('USER_NOT_FOUND', 'User not found or disabled')
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: Array.isArray(user.permissions) ? user.permissions as string[] : []
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('USER_RETRIEVAL_FAILED', 'Failed to retrieve user')
    }
  }

  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('admin:all')
  }

  static hasRole(userRole: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(userRole) || userRole === 'admin'
  }
}

// Middleware utilities for Next.js API routes
export function requireAuth(requiredPermissions?: string[], allowedRoles?: string[]) {
  return async (req: any) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('MISSING_TOKEN', 'Authorization token required', 401)
    }

    const token = authHeader.split(' ')[1]
    const user = await AuthService.getCurrentUser(token)

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some(permission => 
        AuthService.hasPermission(user.permissions, permission)
      )
      if (!hasPermission) {
        throw new AuthError('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions', 403)
      }
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!AuthService.hasRole(user.role, allowedRoles)) {
        throw new AuthError('INSUFFICIENT_ROLE', 'Insufficient role', 403)
      }
    }

    return user
  }
}