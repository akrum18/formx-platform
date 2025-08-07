import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

// Singleton pattern for Prisma client
export const prisma = globalThis.__prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Export types for use in applications
export * from '@prisma/client'

// Database utilities
export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect()
}

// Health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date() }
  } catch (error) {
    return { status: 'unhealthy', error: (error as Error).message, timestamp: new Date() }
  }
}

// Migration utilities
export async function validateSchema() {
  try {
    // Check if all required tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    const requiredTables = [
      'Finish', 'Material', 'Process', 'Routing', 'RoutingStep',
      'PricingConfiguration', 'RoutingPricing', 'Part', 'User', 'AuditLog'
    ]
    
    const existingTables = (tables as any[]).map(t => t.table_name)
    const missingTables = requiredTables.filter(table => !existingTables.includes(table))
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`)
    }
    
    return { 
      schema_validated: true, 
      all_tables_exist: true, 
      existing_tables: existingTables.length,
      timestamp: new Date()
    }
  } catch (error) {
    return {
      schema_validated: false,
      all_tables_exist: false,
      error: (error as Error).message,
      timestamp: new Date()
    }
  }
}