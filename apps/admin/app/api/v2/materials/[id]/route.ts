import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating materials
const UpdateMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  markup: z.number().min(0, 'Markup must be non-negative').optional(),
  density: z.number().min(0, 'Density must be positive').optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  processIds: z.array(z.string()).optional(),
  active: z.boolean().optional()
})

// GET /api/v2/materials/[id] - Get a specific material (DEMO VERSION)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 150))

    const { id } = params

    // Mock material lookup
    const mockMaterial = {
      id,
      name: `Material ${id}`,
      cost: 5.0,
      markup: 30,
      density: 3.5,
      unit: "lb",
      processes: ["CNC Milling", "CNC Turning"],
      processIds: ["proc-1", "proc-2"],
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(mockMaterial)

  } catch (error) {
    console.error('GET /api/v2/materials/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/materials/[id] - Update a specific material (DEMO VERSION)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))

    const { id } = params
    const body = await request.json()
    
    // Validate request body
    const validation = UpdateMaterialSchema.safeParse(body)
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

    const updateData = validation.data

    // Create mock updated material
    const updatedMaterial = {
      id,
      name: updateData.name || `Material ${id}`,
      cost: updateData.cost || 5.0,
      markup: updateData.markup || 30,
      density: updateData.density || 3.5,
      unit: updateData.unit || "lb",
      processes: updateData.processIds?.map(pid => `Process ${pid}`) || ["CNC Milling"],
      processIds: updateData.processIds || ["proc-1"],
      active: updateData.active ?? true,
      createdAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('✏️ Updated material (DEMO):', updatedMaterial)

    return NextResponse.json(updatedMaterial)

  } catch (error) {
    console.error('PUT /api/v2/materials/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/materials/[id] - Delete a specific material (DEMO VERSION)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    const { id } = params

    console.log('🗑️ Deleted material (DEMO):', id)

    return NextResponse.json({ message: 'Material deleted successfully' })

  } catch (error) {
    console.error('DELETE /api/v2/materials/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}