import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
export const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production-use-strong-random-key'

export interface TestConfig {
  adminUrl: string
  frontendUrl: string
  erpUrl: string
}

export const TEST_CONFIG: TestConfig = {
  adminUrl: 'http://localhost:4000',
  frontendUrl: 'http://localhost:4001',
  erpUrl: 'http://localhost:4002'
}

export interface TestResult {
  endpoint: string
  method: string
  status: number
  success: boolean
  responseTime: number
  error?: string
  data?: any
}

export function createTestToken(userId: string, email: string, role: string = 'admin'): string {
  return jwt.sign(
    {
      sub: userId,
      email: email,
      role: role,
      permissions: [
        'read:all', 'create:all', 'update:all', 'delete:all'
      ]
    },
    JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'formx-validation',
      audience: 'formx-platform'
    }
  )
}

export async function testEndpoint(
  baseUrl: string,
  method: string,
  endpoint: string,
  token?: string,
  body?: any
): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
    
    const responseTime = Date.now() - startTime
    let data = null
    
    try {
      data = await response.json()
    } catch {
      // Response might not be JSON
    }
    
    return {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      responseTime,
      data
    }
  } catch (error) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function validateSchema(data: any, schema: any): Promise<boolean> {
  try {
    schema.parse(data)
    return true
  } catch {
    return false
  }
}

export async function setupTestUser() {
  // Check if test user exists
  let testUser = await prisma.user.findUnique({
    where: { email: 'validation@formx.com' }
  })
  
  if (!testUser) {
    // Create test user
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('validationpassword123', 10)
    
    testUser = await prisma.user.create({
      data: {
        email: 'validation@formx.com',
        password: hashedPassword,
        name: 'Validation User',
        role: 'admin'
      }
    })
  }
  
  return testUser
}

export async function cleanupTestData() {
  // Clean up test data created during validation
  await prisma.user.deleteMany({
    where: { email: { contains: 'validation' } }
  })
}

export function formatTestResults(results: TestResult[]): string {
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const avgResponseTime = results.reduce((acc, r) => acc + r.responseTime, 0) / results.length
  
  let output = `\n📊 Test Results Summary\n`
  output += `${'='.repeat(50)}\n`
  output += `✅ Passed: ${passed}\n`
  output += `❌ Failed: ${failed}\n`
  output += `⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms\n`
  output += `${'='.repeat(50)}\n\n`
  
  if (failed > 0) {
    output += `Failed Tests:\n`
    results.filter(r => !r.success).forEach(r => {
      output += `  ❌ ${r.method} ${r.endpoint} - Status: ${r.status}\n`
      if (r.error) output += `     Error: ${r.error}\n`
    })
  }
  
  return output
}

export async function waitForApp(url: string, maxRetries: number = 30): Promise<boolean> {
  console.log(`⏳ Waiting for app at ${url}...`)
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) {
        console.log(`✅ App is ready at ${url}`)
        return true
      }
    } catch {
      // App not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`❌ App failed to start at ${url}`)
  return false
}