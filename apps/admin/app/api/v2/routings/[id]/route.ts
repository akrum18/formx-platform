import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../../lib/auth'

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
  isPrimaryPricingRoute: z.boolean().optional(),
  totalSetupTime: z.number().optional()
})

export const GET = requirePermission('routings', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    
    const routing = await prisma.routing.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            process: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    if (!routing) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Routing not found' },
        { status: 404 }
      )
    }

    // Transform to match expected format
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

    const response = {
      ...routing,
      steps: transformedSteps,
      totalSetupTime,
      createdAt: routing.createdAt.toISOString(),
      updatedAt: routing.updatedAt.toISOString(),
      isPrimaryPricingRoute: false // TODO: Implement primary routing logic
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v2/routings/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const PUT = requirePermission('routings', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    
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

    const { steps, ...updateData } = validation.data

    // Use transaction for updating routing and steps
    const updatedRouting = await prisma.$transaction(async (tx) => {
      let routingUpdateData = updateData
      let processes: any[] = []

      // If steps are provided, calculate new total setup time
      if (steps) {
        // Fetch processes to calculate total setup time and get process names
        const processIds = steps.map(step => step.processId)
        processes = await tx.process.findMany({
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

        routingUpdateData = { ...updateData, totalSetupTime }
      }

      // Update the routing itself
      const routing = await tx.routing.update({
        where: { id },
        data: routingUpdateData
      })

      // If steps are provided, replace all existing steps
      if (steps) {
        // Delete existing steps
        await tx.routingStep.deleteMany({
          where: { routingId: id }
        })

        // Create new steps
        await tx.routingStep.createMany({
          data: steps.map(step => {
            const process = processes.find(p => p.id === step.processId)
            return {
              routingId: id,
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
        })
      }

      // Return updated routing with steps
      return await tx.routing.findUnique({
        where: { id },
        include: {
          steps: {
            include: {
              process: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      })
    })

    if (!updatedRouting) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Routing not found' },
        { status: 404 }
      )
    }

    // Transform to match expected format
    const transformedSteps = updatedRouting.steps.map(step => ({
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

    const response = {
      ...updatedRouting,
      steps: transformedSteps,
      totalSetupTime,
      createdAt: updatedRouting.createdAt.toISOString(),
      updatedAt: updatedRouting.updatedAt.toISOString(),
      isPrimaryPricingRoute: false
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Routing not found' },
        { status: 404 }
      )
    }
    
    console.error('PUT /api/v2/routings/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})

export const DELETE = requirePermission('routings', async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    // Use transaction to delete routing and its steps
    await prisma.$transaction(async (tx) => {
      // Delete routing steps first (due to foreign key constraint)
      await tx.routingStep.deleteMany({
        where: { routingId: id }
      })

      // Delete the routing
      await tx.routing.delete({
        where: { id }
      })
    })

    return NextResponse.json({ message: 'Routing deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Routing not found' },
        { status: 404 }
      )
    }
    
    console.error('DELETE /api/v2/routings/[id] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})