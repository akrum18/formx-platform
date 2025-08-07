import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding frontend data...')

  // Create test customer
  const testCustomer = await prisma.customer.upsert({
    where: { email: 'john.smith@acme.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'john.smith@acme.com',
      phone: '(555) 123-4567',
      company: 'Acme Engineering',
      paymentStatus: 'Good Standing',
      createdBy: 'system',
    }
  })

  console.log('✅ Created test customer:', testCustomer.name)

  // Create test parts using existing materials, processes, and finishes
  const materials = await prisma.material.findMany({ where: { active: true }, take: 3 })
  const processes = await prisma.process.findMany({ where: { active: true }, take: 3 })
  const finishes = await prisma.finish.findMany({ where: { active: true }, take: 2 })

  if (!materials.length || !processes.length) {
    console.log('⚠️  No materials or processes found. Please run admin seed first.')
    return
  }

  const testParts = []
  
  // Create a few test parts
  for (let i = 0; i < 3; i++) {
    const part = await prisma.part.create({
      data: {
        partName: `Test Part ${i + 1}`,
        quantity: 10 + i * 5,
        tolerance: i === 0 ? 'Standard' : i === 1 ? 'Tight' : 'Custom',
        fileName: `test_part_${i + 1}.step`,
        fileSize: 1024 * (i + 1),
        fileType: 'application/step',
        fileUrl: `/uploads/test_part_${i + 1}.step`,
        processId: processes[i % processes.length].id,
        materialId: materials[i % materials.length].id,
        finishId: i < finishes.length ? finishes[i].id : null,
        createdBy: 'system',
      }
    })
    testParts.push(part)
  }

  console.log('✅ Created test parts:', testParts.length)

  // Create test RFQ
  const testRFQ = await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2025-001',
      customerId: testCustomer.id,
      status: 'Submitted',
      customerNotes: 'Need these parts for a prototype demonstration. Tight timeline required.',
      createdBy: 'system',
      parts: {
        create: testParts.map(part => ({
          partId: part.id,
          quantity: part.quantity,
          tolerance: part.tolerance,
          leadTime: 'Standard',
          notes: 'Standard manufacturing requirements',
          createdBy: 'system',
        }))
      }
    }
  })

  console.log('✅ Created test RFQ:', testRFQ.rfqNumber)

  // Create test quote from RFQ
  const routings = await prisma.routing.findMany({ where: { active: true }, take: 1 })
  
  if (routings.length > 0) {
    const testQuote = await prisma.quote.create({
      data: {
        quoteNumber: 'QUO-2025-001',
        rfqId: testRFQ.id,
        customerId: testCustomer.id,
        status: 'Sent',
        subtotal: 1250.00,
        discounts: 125.00,
        total: 1125.00,
        tier: 'standard',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        breakdown: {
          volumeDiscount: 10,
          tierMultiplier: 1.0,
          totalParts: testParts.length
        },
        createdBy: 'system',
        parts: {
          create: testParts.map((part, index) => ({
            partId: part.id,
            quantity: part.quantity,
            basePrice: 50.00 + index * 10,
            materialCost: 20.00 + index * 5,
            finishingCost: index < finishes.length ? 15.00 : 0,
            multiplier: 1.0,
            discountPercent: 10,
            discountAmount: (50.00 + index * 10) * 0.1,
            finalPricePerUnit: (50.00 + index * 10) * 0.9,
            totalPrice: ((50.00 + index * 10) * 0.9) * part.quantity,
            createdBy: 'system',
          }))
        }
      }
    })

    console.log('✅ Created test quote:', testQuote.quoteNumber)

    // Update RFQ status to quoted
    await prisma.rFQ.update({
      where: { id: testRFQ.id },
      data: {
        status: 'Quoted',
        estimatedCost: testQuote.total
      }
    })

    // Create test order from quote
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2025-001',
        quoteId: testQuote.id,
        customerId: testCustomer.id,
        status: 'In Production',
        subtotal: testQuote.subtotal,
        tax: testQuote.total * 0.08, // 8% tax
        shipping: 25.00,
        total: testQuote.total + (testQuote.total * 0.08) + 25.00,
        estimatedShipDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        customerNotes: 'Please ship to our main facility.',
        createdBy: 'system',
        parts: {
          create: testParts.map((part, index) => ({
            partId: part.id,
            quantity: part.quantity,
            unitPrice: (50.00 + index * 10) * 0.9,
            totalPrice: ((50.00 + index * 10) * 0.9) * part.quantity,
            status: 'In Production',
            createdBy: 'system',
          }))
        }
      }
    })

    console.log('✅ Created test order:', testOrder.orderNumber)

    // Update quote status to approved
    await prisma.quote.update({
      where: { id: testQuote.id },
      data: {
        status: 'Approved',
        approvedDate: new Date()
      }
    })
  }

  // Create additional historical data for dashboard
  const currentDate = new Date()
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)

  // Create some completed orders for history
  for (let i = 0; i < 3; i++) {
    const completedOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-2024-${String(100 + i).padStart(3, '0')}`,
        customerId: testCustomer.id,
        status: 'Completed',
        subtotal: 500.00 + i * 100,
        tax: (500.00 + i * 100) * 0.08,
        shipping: 15.00,
        total: (500.00 + i * 100) * 1.08 + 15.00,
        orderDate: new Date(lastMonth.getTime() + i * 7 * 24 * 60 * 60 * 1000),
        actualShipDate: new Date(lastMonth.getTime() + (i * 7 + 10) * 24 * 60 * 60 * 1000),
        createdBy: 'system',
        parts: {
          create: [{
            partId: testParts[0].id,
            quantity: 5 + i,
            unitPrice: 50.00,
            totalPrice: 50.00 * (5 + i),
            status: 'Completed',
            createdBy: 'system',
          }]
        }
      }
    })
  }

  console.log('✅ Created historical orders for dashboard')

  console.log('🎉 Frontend seed data created successfully!')
  console.log('')
  console.log('Test data created:')
  console.log(`- Customer: ${testCustomer.name} (${testCustomer.email})`)
  console.log(`- Parts: ${testParts.length} test parts`)
  console.log(`- RFQ: ${testRFQ.rfqNumber} (${testRFQ.status})`)
  console.log(`- Quote: QUO-2025-001 (Sent)`)
  console.log(`- Order: ORD-2025-001 (In Production)`)
  console.log(`- Historical orders: 3 completed orders`)
  console.log('')
  console.log('You can now test the complete RFQ → Quote → Order workflow!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })