#!/usr/bin/env node

/**
 * Simple test script for routing-pricing synchronization
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  console.log('🔌 Testing Database Connection...')
  
  try {
    await prisma.$connect()
    const userCount = await prisma.user.count()
    console.log(`✅ Connected successfully, found ${userCount} users`)
    return true
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`)
    return false
  }
}

async function testSchemaFields() {
  console.log('🔄 Testing Schema Migration...')
  
  try {
    // Test that the new schema fields exist
    const sampleRouting = await prisma.routingPricing.findFirst({
      select: {
        id: true,
        isBaseCostOverridden: true,
        isMarkupOverridden: true,
        isFinishingOverridden: true,
        isLeadTimeOverridden: true,
        routing: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    if (sampleRouting !== null) {
      console.log('✅ New override fields and routing relation exist')
      console.log('   Override fields:', {
        baseCost: sampleRouting.isBaseCostOverridden,
        markup: sampleRouting.isMarkupOverridden,
        finishing: sampleRouting.isFinishingOverridden,
        leadTime: sampleRouting.isLeadTimeOverridden
      })
      console.log('   Routing name:', sampleRouting.routing?.name)
      return true
    } else {
      console.log('⚠️  No routing pricing entries found to test schema')
      return true
    }
  } catch (error) {
    console.log(`❌ Schema validation failed: ${error.message}`)
    return false
  }
}

async function testPricingConfiguration() {
  console.log('💰 Testing Pricing Configuration...')
  
  try {
    const config = await prisma.pricingConfiguration.findFirst({
      where: {
        status: { in: ['draft', 'published'] }
      },
      include: {
        routings: {
          include: {
            routing: true
          }
        }
      }
    })
    
    if (config) {
      console.log(`✅ Found configuration with ${config.routings.length} routing entries`)
      console.log('   Config details:', {
        configId: config.id,
        status: config.status,
        version: config.version
      })
      return true
    } else {
      console.log('❌ No active pricing configurations found')
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

async function testRoutingValidation() {
  console.log('✅ Testing Routing Data...')
  
  try {
    // Get the first active routing for testing
    const testRouting = await prisma.routing.findFirst({
      where: { active: true },
      include: {
        steps: {
          include: {
            process: true
          }
        }
      }
    })
    
    if (!testRouting) {
      console.log('❌ No active routings found in database')
      return false
    }
    
    console.log(`✅ Found routing: ${testRouting.name}`)
    console.log('   Details:', {
      routingId: testRouting.id,
      stepsCount: testRouting.steps.length,
      category: testRouting.category
    })
    return true
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting Routing-Pricing Synchronization Tests\n')
  
  const tests = [
    testDatabaseConnection,
    testSchemaFields,
    testPricingConfiguration,
    testRoutingValidation
  ]
  
  let passed = 0
  let total = tests.length
  
  for (const test of tests) {
    try {
      const result = await test()
      if (result) passed++
      console.log('')
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}\n`)
    }
  }
  
  // Print summary
  console.log('📊 Test Summary:')
  console.log('================')
  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${total - passed} ❌`)
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`)
  
  await prisma.$disconnect()
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1)
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})