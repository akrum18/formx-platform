import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating test user for frontend login...')

  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@formx.com' }
    })

    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.email)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('testpassword123', 12)

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@formx.com',
        password: hashedPassword,
        name: 'Test User',
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
      }
    })

    console.log('✅ Created test user:', testUser.email)
    
    // Create a customer for this user
    const customer = await prisma.customer.create({
      data: {
        name: 'Test User',
        email: 'test@formx.com',
        phone: '(555) 123-4567',
        company: 'Test Company',
        paymentStatus: 'Good Standing',
        userId: testUser.id,
        version: 1
      }
    })

    console.log('✅ Created customer:', customer.email)
    console.log('')
    console.log('🎉 Test user setup complete!')
    console.log('Email: test@formx.com')
    console.log('Password: testpassword123')
    console.log('Customer ID:', customer.id)
    console.log('User ID:', testUser.id)

  } catch (error) {
    console.error('❌ Error creating test user:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })