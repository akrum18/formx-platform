import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const RoutingStepSchema = z.object({
  processId: z.string().min(1, 'Process ID is required'),
  sequence: z.number().int().min(1, 'Sequence must be a positive integer'),
  setupTimeMultiplier: z.number().min(0.1, 'Setup time multiplier must be at least 0.1'),
  runtimeMultiplier: z.number().min(0.1, 'Runtime multiplier must be at least 0.1'),
  notes: z.string().optional()
})

const UpdateRoutingSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  steps: z.array(RoutingStepSchema).min(1, 'At least one step is required').optional(),
  estimatedLeadTime: z.number().int().min(1, 'Lead time must be at least 1 day').optional(),
  materialMarkup: z.number().min(0, 'Material markup must be non-negative').optional(),
  finishingCost: z.number().min(0, 'Finishing cost must be non-negative').optional(),
  active: z.boolean().optional(),
  isPrimaryPricingRoute: z.boolean().optional()
})

// GET /api/v2/routings/[id] - Get a specific routing (DEMO VERSION)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    const { id } = params

    // Mock routing lookup with complex steps
    const mockRouting = {
      id,
      name: `Routing ${id}`,
      description: "Complex multi-step manufacturing routing",
      category: "Sheet Metal",
      steps: [
        {
          id: "s1",
          processId: "1",
          processName: "Laser Cutting",
          sequence: 1,
          setupTimeMultiplier: 1.0,
          runtimeMultiplier: 1.0,
          notes: "Cut to size with standard tolerances",
          setupTime: 15,
          hourlyRate: 95,
          minimumCost: 25,
          complexityMultiplier: 1.0,
        },
        {
          id: "s2",
          processId: "9",
          processName: "Deburring",
          sequence: 2,
          setupTimeMultiplier: 0.5,
          runtimeMultiplier: 0.8,
          notes: "Remove sharp edges",
          setupTime: 5,
          hourlyRate: 45,
          minimumCost: 15,
          complexityMultiplier: 0.5,
        },
      ],
      totalSetupTime: 30,
      estimatedLeadTime: 5,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      materialMarkup: 35,
      finishingCost: 0.15,
      isPrimaryPricingRoute: false,
    }

    return NextResponse.json(mockRouting)

  } catch (error) {
    console.error('GET /api/v2/routings/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v2/routings/[id] - Update a specific routing (DEMO VERSION)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 350))

    const { id } = params
    const body = await request.json()
    
    // Validate request body
    const validation = UpdateRoutingSchema.safeParse(body)
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

    // Mock enhanced steps if steps are being updated
    let enhancedSteps = []
    if (updateData.steps) {
      enhancedSteps = updateData.steps.map((step, index) => ({
        id: step.id || `step-${Date.now()}-${index}`,
        processId: step.processId,
        processName: `Process ${step.processId}`, // Mock process name
        sequence: step.sequence,
        setupTimeMultiplier: step.setupTimeMultiplier,
        runtimeMultiplier: step.runtimeMultiplier,
        notes: step.notes || "",
        // Mock process pricing data
        setupTime: 20,
        hourlyRate: 75,
        minimumCost: 35,
        complexityMultiplier: 1.0,
      }))
    }

    // Calculate total setup time if steps are updated
    const totalSetupTime = enhancedSteps.length > 0 
      ? enhancedSteps.reduce((total, step) => total + (step.setupTime * step.setupTimeMultiplier), 0)
      : 30 // Mock default

    // Create mock updated routing
    const updatedRouting = {
      id,
      name: updateData.name || `Routing ${id}`,
      description: updateData.description || "Updated routing description",
      category: updateData.category || "Sheet Metal",
      steps: enhancedSteps.length > 0 ? enhancedSteps : [
        {
          id: "s1",
          processId: "1",
          processName: "Laser Cutting",
          sequence: 1,
          setupTimeMultiplier: 1.0,
          runtimeMultiplier: 1.0,
          notes: "Mock step",
          setupTime: 15,
          hourlyRate: 95,
          minimumCost: 25,
          complexityMultiplier: 1.0,
        }
      ],
      totalSetupTime,
      estimatedLeadTime: updateData.estimatedLeadTime || 5,
      materialMarkup: updateData.materialMarkup || 35,
      finishingCost: updateData.finishingCost || 0.15,
      active: updateData.active ?? true,
      isPrimaryPricingRoute: updateData.isPrimaryPricingRoute ?? false,
      createdAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('✏️ Updated routing (DEMO):', updatedRouting)

    return NextResponse.json(updatedRouting)

  } catch (error) {
    console.error('PUT /api/v2/routings/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v2/routings/[id] - Delete a specific routing (DEMO VERSION)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))

    const { id } = params

    console.log('🗑️ Deleted routing (DEMO):', id)

    return NextResponse.json({ message: 'Routing deleted successfully' })

  } catch (error) {
    console.error('DELETE /api/v2/routings/[id] error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}