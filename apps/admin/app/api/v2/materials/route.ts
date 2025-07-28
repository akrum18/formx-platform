import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating materials
const MaterialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  cost: z.number().min(0, 'Cost must be non-negative'),
  markup: z.number().min(0, 'Markup must be non-negative'),
  density: z.number().min(0, 'Density must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  processIds: z.array(z.string()).optional(),
  active: z.boolean().optional().default(true)
})

// GET /api/v2/materials - List all materials (DEMO VERSION)
export async function GET(request: NextRequest) {
  try {
    // Simulate slight delay for realistic experience
    await new Promise(resolve => setTimeout(resolve, 200))

    // Mock materials data matching the API structure
    const mockMaterials = [
      {
        id: "1",
        name: "Aluminum 6061",
        cost: 3.5,
        markup: 25,
        density: 2.7,
        unit: "lb",
        processes: ["CNC Milling", "CNC Turning", "5-Axis"],
        processIds: ["proc-1", "proc-2", "proc-3"],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "2",
        name: "Steel 1018",
        cost: 2.8,
        markup: 30,
        density: 7.87,
        unit: "lb",
        processes: ["CNC Milling", "CNC Turning"],
        processIds: ["proc-1", "proc-2"],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "3",
        name: "Titanium Ti-6Al-4V",
        cost: 45.0,
        markup: 40,
        density: 4.43,
        unit: "lb",
        processes: ["5-Axis", "CNC Milling"],
        processIds: ["proc-3", "proc-1"],
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "4",
        name: "Stainless Steel 316",
        cost: 4.2,
        markup: 35,
        density: 8.0,
        unit: "lb",
        processes: ["CNC Milling", "CNC Turning"],
        processIds: ["proc-1", "proc-2"],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "5",
        name: "Brass C360",
        cost: 6.8,
        markup: 28,
        density: 8.5,
        unit: "lb",
        processes: ["CNC Turning", "CNC Milling"],
        processIds: ["proc-2", "proc-1"],
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // Apply filters if provided
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const processId = searchParams.get('processId')

    let filteredMaterials = mockMaterials
    
    if (active !== null) {
      filteredMaterials = filteredMaterials.filter(m => m.active === (active === 'true'))
    }
    
    if (processId) {
      filteredMaterials = filteredMaterials.filter(m => m.processIds.includes(processId))
    }

    return NextResponse.json(filteredMaterials)

  } catch (error) {
    console.error('GET /api/v2/materials error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/materials - Create a new material (DEMO VERSION)
export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const body = await request.json()
    
    // Validate request body
    const validation = MaterialSchema.safeParse(body)
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

    const { name, cost, markup, density, unit, processIds = [], active } = validation.data

    // Create mock material response
    const newMaterial = {
      id: `mat-${Date.now()}`,
      name,
      cost,
      markup,
      density,
      unit,
      processes: processIds.map(id => `Process ${id}`), // Mock process names
      processIds,
      active: active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('📝 Created material (DEMO):', newMaterial)

    return NextResponse.json(newMaterial, { status: 201 })

  } catch (error) {
    console.error('POST /api/v2/materials error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}