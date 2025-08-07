import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema for RFQ creation
const createRFQSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  process_types: z.array(z.string()).min(1),
  materials: z.array(z.string()).min(1),
  quantity_range: z.string().min(1),
  budget_range: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.string().min(1),
  confidentiality_level: z.string().min(1),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = createRFQSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          detail: 'Validation failed',
          errors: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Get customer ID from the test user we created
    // Find the customer associated with our test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@formx.com' },
      include: { customer: true }
    })

    if (!testUser || !testUser.customer) {
      return NextResponse.json(
        { detail: 'User or customer not found. Please ensure you are logged in.' },
        { status: 401 }
      )
    }

    const customerId = testUser.customer.id

    // Generate RFQ number
    const rfqCount = await prisma.rFQ.count()
    const rfqNumber = `RFQ-${String(rfqCount + 1).padStart(6, '0')}`

    // Create the RFQ with available fields
    const rfq = await prisma.rFQ.create({
      data: {
        rfqNumber,
        customerId,
        status: 'Draft',
        submittedDate: new Date(),
        customerNotes: `${data.title}\n\n${data.description || ''}\n\nPriority: ${data.priority}\nQuantity: ${data.quantity_range}\nBudget: ${data.budget_range || 'Not specified'}\nConfidentiality: ${data.confidentiality_level}\n\nNotes: ${data.notes || ''}`,
        createdBy: customerId
      }
    })

    // You would typically also create RFQPart records here for each combination
    // of processes and materials, but for now we'll just return the basic RFQ

    return NextResponse.json({
      id: rfq.id,
      rfq_number: rfq.rfqNumber,
      status: rfq.status,
      created_at: rfq.submittedDate
    })

  } catch (error) {
    console.error('Error creating RFQ:', error)
    return NextResponse.json(
      { detail: 'An error occurred while creating the RFQ' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}