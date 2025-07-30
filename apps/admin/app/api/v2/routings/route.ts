import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../lib/auth'

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

export const GET = requirePermission('routings', async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause
    const where: any = {}
    if (active !== null) {
      where.active = active === 'true'
    }
    if (category) {
      where.category = category
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const routings = await prisma.routing.findMany({
      where,
      orderBy,
      include: {
        steps: {
          include: {
            process: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    // Transform to match expected format
    const response = routings.map(routing => {
      const transformedSteps = routing.steps.map(step => ({
        id: step.id,
        processId: step.processId,
        processName: step.process.name,
        sequence: step.sequence,
        setupTimeMultiplier: step.setupTimeMultiplier,
        runtimeMultiplier: step.runtimeMultiplier,
        notes: step.notes || '',
        setupTime: step.process.setupTime,
        hourlyRate: step.process.hourlyRate,
        minimumCost: step.process.minimumCost,
        complexityMultiplier: step.process.complexityMultiplier
      }))

      // Calculate total setup time
      const totalSetupTime = transformedSteps.reduce((total, step) => 
        total + (step.setupTime * step.setupTimeMultiplier), 0
      )

      return {
        ...routing,
        steps: transformedSteps,
        totalSetupTime,
        createdAt: routing.createdAt.toISOString(),
        updatedAt: routing.updatedAt.toISOString(),
        isPrimaryPricingRoute: false // TODO: Implement primary routing logic
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/routings error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const POST = requirePermission('routings', async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    
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

    const { steps, ...routingData } = validation.data

    // Fetch processes to calculate total setup time and get process names
    const processIds = steps.map(step => step.processId)
    const processes = await prisma.process.findMany({
      where: { id: { in: processIds } },
      select: { 
        id: true, 
        name: true, 
        setupTime: true, 
        hourlyRate: true, 
        minimumCost: true, 
        complexityMultiplier: true 
      }
    })

    // Calculate total setup time
    const totalSetupTime = steps.reduce((total, step) => {
      const process = processes.find(p => p.id === step.processId)
      return total + (process?.setupTime || 0) * step.setupTimeMultiplier
    }, 0)

    // Create routing with steps in a transaction
    const newRouting = await prisma.routing.create({
      data: {
        ...routingData,
        totalSetupTime,
        createdBy: user.id,
        steps: {
          create: steps.map(step => {
            const process = processes.find(p => p.id === step.processId)
            return {
              processId: step.processId,
              processName: process?.name || '',
              sequence: step.sequence,
              setupTimeMultiplier: step.setupTimeMultiplier,
              runtimeMultiplier: step.runtimeMultiplier,
              setupTime: process?.setupTime || 0,
              hourlyRate: process?.hourlyRate || 0,
              minimumCost: process?.minimumCost || 0,
              complexityMultiplier: process?.complexityMultiplier || 1,
              notes: step.notes || '',
              createdBy: user.id
            }
          })
        }
      },
      include: {
        steps: {
          include: {
            process: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    // Transform to match expected format
    const transformedSteps = newRouting.steps.map(step => ({
      id: step.id,
      processId: step.processId,
      processName: step.process.name,
      sequence: step.sequence,
      setupTimeMultiplier: step.setupTimeMultiplier,
      runtimeMultiplier: step.runtimeMultiplier,
      notes: step.notes || '',
      setupTime: step.process.setupTime,
      hourlyRate: step.process.hourlyRate,
      minimumCost: step.process.minimumCost,
      complexityMultiplier: step.process.complexityMultiplier
    }))

    const response = {
      ...newRouting,
      steps: transformedSteps,
      totalSetupTime: newRouting.totalSetupTime,
      createdAt: newRouting.createdAt.toISOString(),
      updatedAt: newRouting.updatedAt.toISOString(),
      isPrimaryPricingRoute: false
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/v2/routings error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})