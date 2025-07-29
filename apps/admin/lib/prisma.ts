import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

// Singleton pattern for Prisma client
export const prisma = globalThis.__prisma || new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: "postgresql://ai:ai@localhost:5532/formx_platform"
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}