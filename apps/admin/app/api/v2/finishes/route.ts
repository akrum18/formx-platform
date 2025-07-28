import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating finishes
const FinishSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  costPerSqIn: z.number().min(0, 'Cost must be non-negative'),
  leadTimeDays: z.number().int().min(0, 'Lead time must be non-negative'),
  description: z.string().optional(),
  active: z.boolean().optional().default(true)
})

// Mock data store
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

// GET /api/v2/finishes - List all finishes (DEMO VERSION)
export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 150))

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const type = searchParams.get('type')

    // Filter finishes
    let filteredFinishes = mockFinishes
    if (active !== null) {
      filteredFinishes = filteredFinishes.filter(f => f.active === (active === 'true'))
    }
    if (type) {
      filteredFinishes = filteredFinishes.filter(f => f.type === type)
    }

    // Sort by name
    filteredFinishes.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(filteredFinishes)

  } catch (error) {
    console.error('GET /api/v2/finishes error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/finishes - Create a new finish (DEMO VERSION)
export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const body = await request.json()
    
    // Validate request body
    const validation = FinishSchema.safeParse(body)
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

    const { name, type, costPerSqIn, leadTimeDays, description, active } = validation.data

    // Create new finish
    const newFinish = {
      id: (Date.now() + Math.random()).toString(),
      name,
      type,
      costPerSqIn,
      leadTimeDays,
      description: description || "",
      active: active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add to mock store
    mockFinishes.push(newFinish)

    console.log('✏️ Created finish (DEMO):', newFinish)

    return NextResponse.json(newFinish, { status: 201 })

  } catch (error) {
    console.error('POST /api/v2/finishes error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}