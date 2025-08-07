import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@formx/database'

// JWT Payload interface matching migration docs
export interface JWTPayload {
  sub: string;          // User ID
  email: string;
  role: string;
  permissions: string[];
  exp: number;          // Expiration timestamp
}

// Auth configuration
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'

// Validation schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string()
})

// Auth utilities
export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static async createAccessToken(user: { id: string; email: string; role: string; permissions: string[] }): Promise<string> {
    const payload: Omit<JWTPayload, 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    }

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY,
      issuer: 'formx-api',
      audience: 'formx-platform'
    } as any)
  }

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

  static async authenticateUser(email: string, password: string) {
    try {
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
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password')
      }

      if (user.disabled) {
        throw new AuthError('USER_DISABLED', 'User account is disabled')
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password)
      if (!isValidPassword) {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password')
      }

      // Create access token
      const permissions = Array.isArray(user.permissions) ? user.permissions as string[] : []
      const accessToken = await this.createAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        permissions
      })

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions
        },
        accessToken
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('AUTHENTICATION_FAILED', 'Authentication failed')
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

// Helper function to create test users
export async function createTestUser(email: string, password: string, role: string = 'user', permissions: string[] = []) {
  const hashedPassword = await AuthService.hashPassword(password)
  
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: `Test User (${email})`,
      role,
      permissions
    }
  })
}