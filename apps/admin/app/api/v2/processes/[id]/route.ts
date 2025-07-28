import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating processes
const UpdateProcessSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  setupTime: z.number().min(0, 'Setup time must be non-negative').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative').optional(),
  minimumCost: z.number().min(0, 'Minimum cost must be non-negative').optional(),
  complexityMultiplier: z.number().min(0.1, 'Complexity multiplier must be at least 0.1').optional(),
  active: z.boolean().optional()
})

// GET /api/v2/processes/[id] - Get a specific process (DEMO VERSION)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 150))

    const { id } = params

    // Mock process lookup
    const mockProcess = {
      id,
      name: `Process ${id}`,
      category: "Machining",
      setupTime: 30,
      hourlyRate: 85,
      minimumCost: 50,
      complexityMultiplier: 1.2,
      materials: ["Aluminum 6061", "Steel 1018"],
      materialIds: ["mat-1", "mat-2"],
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(mockProcess)

  } catch (error) {
    console.error('GET /api/v2/processes/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/processes/[id] - Update a specific process (DEMO VERSION)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))

    const { id } = params
    const body = await request.json()
    
    // Validate request body
    const validation = UpdateProcessSchema.safeParse(body)
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

    // Create mock updated process
    const updatedProcess = {
      id,
      name: updateData.name || `Process ${id}`,
      category: updateData.category || "Machining",
      setupTime: updateData.setupTime || 30,
      hourlyRate: updateData.hourlyRate || 85,
      minimumCost: updateData.minimumCost || 50,
      complexityMultiplier: updateData.complexityMultiplier || 1.2,
      materials: ["Aluminum 6061"], // Mock materials
      materialIds: ["mat-1"],
      active: updateData.active ?? true,
      createdAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('✏️ Updated process (DEMO):', updatedProcess)

    return NextResponse.json(updatedProcess)

  } catch (error) {
    console.error('PUT /api/v2/processes/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/processes/[id] - Delete a specific process (DEMO VERSION)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    const { id } = params

    console.log('🗑️ Deleted process (DEMO):', id)

    return NextResponse.json({ message: 'Process deleted successfully' })

  } catch (error) {
    console.error('DELETE /api/v2/processes/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}