import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating processes
const ProcessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  setupTime: z.number().min(0, 'Setup time must be non-negative'),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative'),
  minimumCost: z.number().min(0, 'Minimum cost must be non-negative'),
  complexityMultiplier: z.number().min(0.1, 'Complexity multiplier must be at least 0.1'),
  active: z.boolean().optional().default(true)
})

// GET /api/v2/processes - List all processes (DEMO VERSION)
export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 200))

    // Mock processes data
    const mockProcesses = [
      {
        id: "1",
        name: "CNC Milling",
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
      },
      {
        id: "2",
        name: "CNC Turning",
        category: "Machining",
        setupTime: 20,
        hourlyRate: 75,
        minimumCost: 40,
        complexityMultiplier: 1.0,
        materials: ["Aluminum 6061", "Brass C360"],
        materialIds: ["mat-1", "mat-3"],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "3",
        name: "5-Axis CNC",
        category: "Advanced Machining",
        setupTime: 45,
        hourlyRate: 120,
        minimumCost: 100,
        complexityMultiplier: 1.8,
        materials: ["Titanium Ti-6Al-4V"],
        materialIds: ["mat-4"],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "4",
        name: "Wire EDM",
        category: "EDM",
        setupTime: 60,
        hourlyRate: 95,
        minimumCost: 75,
        complexityMultiplier: 1.5,
        materials: ["Steel 1018"],
        materialIds: ["mat-2"],
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "5",
        name: "Sinker EDM",
        category: "EDM",
        setupTime: 90,
        hourlyRate: 110,
        minimumCost: 100,
        complexityMultiplier: 2.0,
        materials: ["Steel 1018", "Stainless Steel 316"],
        materialIds: ["mat-2", "mat-5"],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // Apply filters
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const category = searchParams.get('category')

    let filteredProcesses = mockProcesses
    
    if (active !== null) {
      filteredProcesses = filteredProcesses.filter(p => p.active === (active === 'true'))
    }
    
    if (category) {
      filteredProcesses = filteredProcesses.filter(p => p.category === category)
    }

    return NextResponse.json(filteredProcesses)

  } catch (error) {
    console.error('GET /api/v2/processes error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/v2/processes - Create a new process (DEMO VERSION)
export async function POST(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const body = await request.json()
    
    // Validate request body
    const validation = ProcessSchema.safeParse(body)
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

    const { name, category, setupTime, hourlyRate, minimumCost, complexityMultiplier, active } = validation.data

    // Create mock process response
    const newProcess = {
      id: `proc-${Date.now()}`,
      name,
      category,
      setupTime,
      hourlyRate,
      minimumCost,
      complexityMultiplier,
      materials: [], // No materials initially
      materialIds: [],
      active: active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('📝 Created process (DEMO):', newProcess)

    return NextResponse.json(newProcess, { status: 201 })

  } catch (error) {
    console.error('POST /api/v2/processes error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      { status: 500 }
    )
  }
}