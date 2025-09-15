import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  const startTime = Date.now()
  
  const health = {
    status: 'healthy',
    app: 'admin',
    port: process.env.PORT || 4000,
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      api: true,
      auth: true
    },
    version: '1.0.0',
    uptime: process.uptime(),
    responseTime: 0
  }
  
  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = true
  } catch (error) {
    health.status = 'degraded'
    health.checks.database = false
  }
  
  health.responseTime = Date.now() - startTime
  
  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${health.responseTime}ms`
    }
  })
}