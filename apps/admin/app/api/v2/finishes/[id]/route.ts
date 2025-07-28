import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating finishes
const UpdateFinishSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.string().min(1, 'Type is required').optional(),
  costPerSqIn: z.number().min(0, 'Cost must be non-negative').optional(),
  leadTimeDays: z.number().int().min(0, 'Lead time must be non-negative').optional(),
  description: z.string().optional(),
  active: z.boolean().optional()
})

// Mock data store (should be shared, but for demo purposes we'll recreate it)
let mockFinishes = [
  {
    id: "1",
    name: "Clear Anodizing",
    type: "Anodizing",
    costPerSqIn: 0.125,
    leadTimeDays: 7,
    description: "Clear anodized finish with protective coating", 
    active: true,
    createdAt: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
    updatedAt: new Date(Date.now() - 1*24*60*60*1000).toISOString()
  },
  {
    id: "2",
    name: "Black Powder Coat", 
    type: "Powder Coating",
    costPerSqIn: 0.095,
    leadTimeDays: 5,
    description: "Durable black powder coating finish",
    active: true,
    createdAt: new Date(Date.now() - 14*24*60*60*1000).toISOString(),
    updatedAt: new Date(Date.now() - 3*24*60*60*1000).toISOString()
  },
  {
    id: "3",
    name: "Zinc Plating",
    type: "Plating", 
    costPerSqIn: 0.075,
    leadTimeDays: 10,
    description: "Corrosion-resistant zinc plating",
    active: true,
    createdAt: new Date(Date.now() - 21*24*60*60*1000).toISOString(),
    updatedAt: new Date(Date.now() - 5*24*60*60*1000).toISOString()
  },
  {
    id: "4",
    name: "Passivation Treatment",
    type: "Chemical",
    costPerSqIn: 0.055,
    leadTimeDays: 3,
    description: "Chemical passivation for stainless steel",
    active: false,
    createdAt: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    updatedAt: new Date(Date.now() - 2*24*60*60*1000).toISOString()
  }
]

// GET /api/v2/finishes/[id] - Get a specific finish (DEMO VERSION)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 100))

    const { id } = params

    // Find finish in mock store
    const finish = mockFinishes.find(f => f.id === id)

    if (!finish) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Finish not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(finish)

  } catch (error) {
    console.error('GET /api/v2/finishes/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/finishes/[id] - Update a specific finish (DEMO VERSION)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))

    const { id } = params
    const body = await request.json()
    
    // Validate request body
    const validation = UpdateFinishSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    // Find finish in mock store
    const finishIndex = mockFinishes.findIndex(f => f.id === id)

    if (finishIndex === -1) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Finish not found'
        },
        { status: 404 }
      )
    }

    const updateData = validation.data

    // Update finish in mock store
    const updatedFinish = {
      ...mockFinishes[finishIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    }
    
    mockFinishes[finishIndex] = updatedFinish

    console.log('✏️ Updated finish (DEMO):', updatedFinish)

    return NextResponse.json(updatedFinish)

  } catch (error) {
    console.error('PUT /api/v2/finishes/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/finishes/[id] - Delete a specific finish (DEMO VERSION)  
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    const { id } = params

    // Find finish in mock store
    const finishIndex = mockFinishes.findIndex(f => f.id === id)

    if (finishIndex === -1) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Finish not found'
        },
        { status: 404 }
      )
    }

    // Soft delete by setting active to false
    mockFinishes[finishIndex] = {
      ...mockFinishes[finishIndex],
      active: false,
      updatedAt: new Date().toISOString()
    }

    console.log('🗑️ Deleted finish (DEMO):', id)

    return NextResponse.json({ message: 'Finish deleted successfully' })

  } catch (error) {
    console.error('DELETE /api/v2/finishes/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}