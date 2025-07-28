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

const RoutingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  steps: z.array(RoutingStepSchema).min(1, 'At least one step is required'),
  estimatedLeadTime: z.number().int().min(1, 'Lead time must be at least 1 day'),
  materialMarkup: z.number().min(0, 'Material markup must be non-negative'),
  finishingCost: z.number().min(0, 'Finishing cost must be non-negative'),
  active: z.boolean().optional().default(true)
})

// GET /api/v2/routings - List all routings (DEMO VERSION)
export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 250))

    // Mock routings data with complex routing steps
    const mockRoutings = [
      {
        id: "1",
        name: "Laser Cutting - Deburring - Press Brake Bending - TIG Welding",
        description: "Standard sheet metal fabrication for brackets and enclosures",
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
          {
            id: "s3",
            processId: "4", 
            processName: "Press Brake Bending",
            sequence: 3,
            setupTimeMultiplier: 1.2,
            runtimeMultiplier: 1.0,
            notes: "Form bends per drawing",
            setupTime: 10,
            hourlyRate: 65,
            minimumCost: 30,
            complexityMultiplier: 0.8,
          },
          {
            id: "s4",
            processId: "7",
            processName: "TIG Welding", 
            sequence: 4,
            setupTimeMultiplier: 1.5,
            runtimeMultiplier: 1.3,
            notes: "Weld joints as specified",
            setupTime: 25,
            hourlyRate: 90,
            minimumCost: 45,
            complexityMultiplier: 1.5,
          },
        ],
        totalSetupTime: 120,
        estimatedLeadTime: 5,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        materialMarkup: 35,
        finishingCost: 0.15,
        isPrimaryPricingRoute: true,
      },
      {
        id: "2",
        name: "CNC Milling - Deburring - Anodizing",
        description: "CNC machined housing with finishing",
        category: "Machining",
        steps: [
          {
            id: "s5",
            processId: "2",
            processName: "CNC Milling",
            sequence: 1,
            setupTimeMultiplier: 1.0,
            runtimeMultiplier: 1.0,
            notes: "Rough and finish machining",
            setupTime: 30,
            hourlyRate: 85,
            minimumCost: 50,
            complexityMultiplier: 1.2,
          },
          {
            id: "s6",
            processId: "9",
            processName: "Deburring",
            sequence: 2,
            setupTimeMultiplier: 0.3,
            runtimeMultiplier: 0.5,
            notes: "Hand deburr all edges",
            setupTime: 5,
            hourlyRate: 45,
            minimumCost: 15,
            complexityMultiplier: 0.5,
          },
          {
            id: "s7",
            processId: "14",
            processName: "Anodizing",
            sequence: 3,
            setupTimeMultiplier: 0.8,
            runtimeMultiplier: 1.0,
            notes: "Clear anodize finish",
            setupTime: 25,
            hourlyRate: 70,
            minimumCost: 40,
            complexityMultiplier: 1.1,
          },
        ],
        totalSetupTime: 90,
        estimatedLeadTime: 7,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        materialMarkup: 40,
        finishingCost: 0.25,
        isPrimaryPricingRoute: false,
      },
      {
        id: "3",
        name: "Laser Cutting - MIG Welding - Powder Coating",
        description: "Multi-component welded assembly",
        category: "Weldments",
        steps: [
          {
            id: "s8",
            processId: "1",
            processName: "Laser Cutting",
            sequence: 1,
            setupTimeMultiplier: 1.0,
            runtimeMultiplier: 1.0,
            notes: "Cut all components",
            setupTime: 15,
            hourlyRate: 95,
            minimumCost: 25,
            complexityMultiplier: 1.0,
          },
          {
            id: "s9",
            processId: "8",
            processName: "MIG Welding",
            sequence: 2,
            setupTimeMultiplier: 2.0,
            runtimeMultiplier: 1.8,
            notes: "Tack and final weld",
            setupTime: 20,
            hourlyRate: 80,
            minimumCost: 40,
            complexityMultiplier: 1.3,
          },
          {
            id: "s10",
            processId: "13",
            processName: "Powder Coating",
            sequence: 3,
            setupTimeMultiplier: 1.0,
            runtimeMultiplier: 1.0,
            notes: "Black powder coat finish",
            setupTime: 20,
            hourlyRate: 65,
            minimumCost: 35,
            complexityMultiplier: 1.0,
          },
        ],
        totalSetupTime: 180,
        estimatedLeadTime: 10,
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        materialMarkup: 30,
        finishingCost: 0.2,
        isPrimaryPricingRoute: false,
      },
      {
        id: "4",
        name: "CNC Milling",
        description: "Simple CNC machining operation",
        category: "Machining",
        steps: [
          {
            id: "s11",
            processId: "2",
            processName: "CNC Milling",
            sequence: 1,
            setupTimeMultiplier: 1.0,
            runtimeMultiplier: 1.0,
            notes: "Standard milling operation",
            setupTime: 30,
            hourlyRate: 85,
            minimumCost: 50,
            complexityMultiplier: 1.2,
          },
        ],
        totalSetupTime: 30,
        estimatedLeadTime: 3,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        materialMarkup: 35,
        finishingCost: 0,
        isPrimaryPricingRoute: false,
      },
      {
        id: "5", 
        name: "Laser Cutting",
        description: "Simple laser cutting operation",
        category: "Cutting",
        steps: [
          {
            id: "s12",
            processId: "1",
            processName: "Laser Cutting",
            sequence: 1,
            setupTimeMultiplier: 1.0,
            runtimeMultiplier: 1.0,
            notes: "Standard laser cutting",
            setupTime: 15,
            hourlyRate: 95,
            minimumCost: 25,
            complexityMultiplier: 1.0,
          },
        ],
        totalSetupTime: 15,
        estimatedLeadTime: 2,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        materialMarkup: 30,
        finishingCost: 0,
        isPrimaryPricingRoute: false,
      },
    ]

    // Apply filters if provided
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const category = searchParams.get('category')

    let filteredRoutings = mockRoutings
    
    if (active !== null) {
      filteredRoutings = filteredRoutings.filter(r => r.active === (active === 'true'))
    }
    
    if (category) {
      filteredRoutings = filteredRoutings.filter(r => r.category === category)
    }

    return NextResponse.json(filteredRoutings)

  } catch (error) {
    console.error('GET /api/v2/routings error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/routings - Create a new routing (DEMO VERSION)
export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 400))

    const body = await request.json()
    
    // Validate request body
    const validation = RoutingSchema.safeParse(body)
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

    const { name, description, category, steps, estimatedLeadTime, materialMarkup, finishingCost, active } = validation.data

    // Mock process lookup to enhance steps with process data
    const enhancedSteps = steps.map((step, index) => ({
      id: `step-${Date.now()}-${index}`,
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

    // Calculate total setup time
    const totalSetupTime = enhancedSteps.reduce((total, step) => 
      total + (step.setupTime * step.setupTimeMultiplier), 0
    )

    // Create mock routing response
    const newRouting = {
      id: `routing-${Date.now()}`,
      name,
      description,
      category,
      steps: enhancedSteps,
      totalSetupTime,
      estimatedLeadTime,
      materialMarkup,
      finishingCost,
      active: active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrimaryPricingRoute: false,
    }

    console.log('📝 Created routing (DEMO):', newRouting)

    return NextResponse.json(newRouting, { status: 201 })

  } catch (error) {
    console.error('POST /api/v2/routings error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}