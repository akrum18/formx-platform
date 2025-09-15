#!/usr/bin/env tsx

// Test script to debug frontend login issue
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'formx-dev-secret-change-in-production'

async function testAuth() {
  console.log('🔍 Testing frontend authentication flow...')
  
  try {
    // 1. Find admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@formx.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        password: true,
        disabled: true,
        customer: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      }
    })

    if (!user) {
      console.log('❌ Admin user not found')
      return
    }

    console.log('✅ Found admin user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      hasCustomer: !!user.customer
    })

    // 2. Test password verification
    const isValidPassword = await bcrypt.compare('admin123', user.password)
    console.log('✅ Password verification:', isValidPassword ? 'PASS' : 'FAIL')

    // 3. Create JWT token (same as auth action)
    const permissions = Array.isArray(user.permissions) ? user.permissions as string[] : []
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions
      },
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'formx-api',
        audience: 'formx-platform'
      }
    )

    // 4. Verify JWT token
    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET, {
        issuer: 'formx-api',
        audience: 'formx-platform'
      })
      console.log('✅ JWT token verification: PASS')
    } catch (error) {
      console.log('❌ JWT token verification: FAIL', error)
    }

    // 5. Test dashboard permission check
    const hasReadDashboard = permissions.includes('read:dashboard') || permissions.includes('admin:all')
    console.log('✅ Has dashboard read permission:', hasReadDashboard)

    // 6. Check if user needs a customer record
    if (!user.customer) {
      console.log('⚠️  Admin user has no customer record - this might be the issue!')
      console.log('   Frontend dashboard expects customerId, but admin is not a customer.')
      
      // Create a customer record for the admin user
      const customer = await prisma.customer.create({
        data: {
          name: user.name,
          email: user.email + '.customer', // Use different email to avoid conflict
          company: 'FormX Admin',
          paymentStatus: 'Good Standing',
          createdBy: user.id,
          userId: user.id,
          version: 1
        }
      })
      
      console.log('✅ Created customer record for admin:', customer.id)
    }

    // 7. Test dashboard data query
    const customerId = user.customer?.id || user.id // Fallback to user.id
    console.log('📊 Testing dashboard query with customerId:', customerId)

    const rfqs = await prisma.rFQ.count({ where: { customerId } })
    const quotes = await prisma.quote.count({ where: { customerId } })
    const orders = await prisma.order.count({ where: { customerId } })

    console.log('✅ Dashboard data counts:', { rfqs, quotes, orders })

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuth()