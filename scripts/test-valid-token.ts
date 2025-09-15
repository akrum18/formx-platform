import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'
const BASE_URL = 'http://localhost:4000'

// Create test JWT token
function createTestToken(userId: string, email: string) {
  return jwt.sign(
    {
      sub: userId,
      email: email,
      role: 'user',
      permissions: [
        'read:cart', 'create:cart', 'update:cart', 'delete:cart',
        'read:rfqs', 'create:rfqs', 'update:rfqs',
        'read:quotes', 'create:quotes',
        'read:orders', 'create:orders',
        'read:customers', 'create:customers',
        'read:dashboard', 'read:pricing', 'create:quotes',
        'read:parts', 'create:parts'
      ]
    },
    JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'formx-api',
      audience: 'formx-platform'
    }
  )
}

async function testValidToken() {
  try {
    console.log('🧪 Testing with valid token...')
    
    // Get test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@formx.com' },
      include: { customer: true }
    })

    if (!testUser) {
      console.log('❌ Test user not found. Run test-auth-simple.ts first.')
      return
    }

    const token = createTestToken(testUser.id, testUser.email)
    console.log('✅ Created test token for:', testUser.email)

    // Test GET /api/v2/cart-simple
    console.log('Testing GET /api/v2/cart-simple with valid token')
    const response = await fetch(`${BASE_URL}/api/v2/cart-simple`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', data)

    // Test POST /api/v2/cart-simple - need a part to add
    const testPart = await prisma.part.findFirst()
    if (testPart) {
      console.log('\nTesting POST /api/v2/cart-simple with valid token')
      const postResponse = await fetch(`${BASE_URL}/api/v2/cart-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          partId: testPart.id,
          quantity: 2,
          tolerance: 'Standard',
          leadTime: 'Standard',
          notes: 'Test cart item'
        })
      })

      console.log('POST Status:', postResponse.status)
      const postData = await postResponse.json()
      console.log('POST Response:', postData)
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testValidToken()