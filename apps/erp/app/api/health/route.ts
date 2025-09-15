import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  
  const health = {
    status: 'healthy',
    app: 'erp',
    port: process.env.PORT || 4002,
    timestamp: new Date().toISOString(),
    checks: {
      database: true, // ERP uses mock data, so always true
      api: true,
      auth: false // No auth implemented yet
    },
    version: '1.0.0',
    uptime: process.uptime(),
    responseTime: 0
  }
  
  health.responseTime = Date.now() - startTime
  
  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${health.responseTime}ms`
    }
  })
}