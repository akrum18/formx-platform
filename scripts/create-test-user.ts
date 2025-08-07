import { createTestUser, AuthService } from '@formx/auth'
import { prisma } from '@formx/database'

async function main() {
  console.log('🔧 Creating test user for API testing...')

  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@formx.com' }
    })

    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.email)
      
      // Create a customer for this user if doesn't exist
      let customer = await prisma.customer.findUnique({
        where: { email: 'test@formx.com' }
      })

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: 'Test User',
            email: 'test@formx.com',
            phone: '(555) 123-4567',
            company: 'Test Company',
            paymentStatus: 'Good Standing',
            userId: existingUser.id,
            createdBy: existingUser.id,
            version: 1
          }
        })
        console.log('✅ Created customer for test user:', customer.email)
      } else {
        console.log('✅ Customer already exists:', customer.email)
      }

      return
    }

    // Create test user with permissions
    const testUser = await createTestUser(
      'test@formx.com',
      'testpassword123',
      'user',
      [
        'read:cart', 'create:cart', 'update:cart', 'delete:cart',
        'read:rfqs', 'create:rfqs', 'update:rfqs',
        'read:quotes', 'create:quotes',
        'read:orders', 'create:orders',
        'read:customers', 'create:customers',
        'read:dashboard', 'read:pricing', 'create:quotes',
        'read:parts', 'create:parts'
      ]
    )

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
        createdBy: testUser.id,
        version: 1
      }
    })

    console.log('✅ Created customer:', customer.email)

    // Test authentication
    const authResult = await AuthService.authenticateUser('test@formx.com', 'testpassword123')
    console.log('✅ Authentication test successful')
    console.log('Access Token (first 20 chars):', authResult.accessToken.substring(0, 20) + '...')
    
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