/**
 * Pricing Synchronization Utilities
 * Handles automatic synchronization between routing configurations and pricing data
 */

import { prisma } from './prisma'

// Types for step calculation
interface RoutingStepData {
  processId: string
  sequence: number
  setupTimeMultiplier: number
  runtimeMultiplier: number
  notes?: string
  setupTime: number
  hourlyRate: number
  minimumCost: number
  complexityMultiplier: number
}

interface RoutingData {
  id: string
  name: string
  description?: string
  category: string
  materialMarkup: number
  finishingCost: number
  estimatedLeadTime: number
  steps: RoutingStepData[]
}

/**
 * Calculate base cost from routing steps using actual manufacturing process rates
 * @param steps Array of routing steps with process data
 * @param estimatedRuntime Runtime in minutes (default: 60 minutes for base calculation)
 * @returns Calculated base cost
 */
export function calculateBaseCost(steps: RoutingStepData[], estimatedRuntime: number = 60): number {
  return steps.reduce((total, step) => {
    // Calculate processing time in hours
    const processingTimeHours = (
      step.setupTime * step.setupTimeMultiplier + 
      estimatedRuntime * step.runtimeMultiplier
    ) / 60

    // Calculate step cost with complexity multiplier
    const stepCost = processingTimeHours * step.hourlyRate * step.complexityMultiplier

    // Apply minimum cost constraint
    return total + Math.max(stepCost, step.minimumCost)
  }, 0)
}

/**
 * Synchronize routing pricing across all active pricing configurations
 * @param routingData The routing data to synchronize
 * @param userId ID of the user performing the operation
 * @param operation Type of operation (create, update, delete)
 */
export async function syncRoutingPricing(
  routingData: RoutingData,
  userId: string,
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  try {
    // Get all active pricing configurations
    const configurations = await prisma.pricingConfiguration.findMany({
      where: {
        status: { in: ['draft', 'published'] }
      },
      include: {
        routings: {
          where: { routingId: routingData.id }
        }
      }
    })

    if (configurations.length === 0) {
      console.log(`No active pricing configurations found for routing sync: ${routingData.id}`)
      return
    }

    // Calculate base cost from routing steps
    const calculatedBaseCost = calculateBaseCost(routingData.steps)

    for (const config of configurations) {
      const existingPricing = config.routings.find(r => r.routingId === routingData.id)

      if (operation === 'delete') {
        // Delete pricing entries for this routing
        if (existingPricing) {
          await prisma.routingPricing.delete({
            where: { id: existingPricing.id }
          })
          
          await logPricingSync(
            routingData.id,
            config.id,
            userId,
            'delete',
            { routingName: routingData.name }
          )
        }
      } else if (operation === 'create') {
        // Create new pricing entry if it doesn't exist
        if (!existingPricing) {
          await prisma.routingPricing.create({
            data: {
              routingId: routingData.id,
              configurationId: config.id,
              category: routingData.category,
              baseCost: calculatedBaseCost,
              materialMarkup: routingData.materialMarkup,
              finishingCost: routingData.finishingCost,
              leadTime: routingData.estimatedLeadTime,
              isBaseCostOverridden: false,
              isMarkupOverridden: false,
              isFinishingOverridden: false,
              isLeadTimeOverridden: false,
              createdBy: userId
            }
          })

          await logPricingSync(
            routingData.id,
            config.id,
            userId,
            'create',
            {
              routingName: routingData.name,
              baseCost: calculatedBaseCost,
              category: routingData.category
            }
          )
        }
      } else if (operation === 'update') {
        if (existingPricing) {
          // Update existing pricing, but preserve manual overrides
          const updateData: any = {}

          // Only update base cost if not manually overridden
          if (!existingPricing.isBaseCostOverridden) {
            updateData.baseCost = calculatedBaseCost
          }

          // Only update markup if not manually overridden
          if (!existingPricing.isMarkupOverridden) {
            updateData.materialMarkup = routingData.materialMarkup
          }

          // Only update finishing cost if not manually overridden
          if (!existingPricing.isFinishingOverridden) {
            updateData.finishingCost = routingData.finishingCost
          }

          // Only update lead time if not manually overridden
          if (!existingPricing.isLeadTimeOverridden) {
            updateData.leadTime = routingData.estimatedLeadTime
          }

          // Always update category (no override flag for this)
          updateData.category = routingData.category

          if (Object.keys(updateData).length > 0) {
            await prisma.routingPricing.update({
              where: { id: existingPricing.id },
              data: updateData
            })

            await logPricingSync(
              routingData.id,
              config.id,
              userId,
              'update',
              {
                routingName: routingData.name,
                updatedFields: Object.keys(updateData),
                preservedOverrides: {
                  baseCost: existingPricing.isBaseCostOverridden,
                  markup: existingPricing.isMarkupOverridden,
                  finishing: existingPricing.isFinishingOverridden,
                  leadTime: existingPricing.isLeadTimeOverridden
                }
              }
            )
          }
        } else {
          // Create new pricing entry for updated routing
          await prisma.routingPricing.create({
            data: {
              routingId: routingData.id,
              configurationId: config.id,
              category: routingData.category,
              baseCost: calculatedBaseCost,
              materialMarkup: routingData.materialMarkup,
              finishingCost: routingData.finishingCost,
              leadTime: routingData.estimatedLeadTime,
              isBaseCostOverridden: false,
              isMarkupOverridden: false,
              isFinishingOverridden: false,
              isLeadTimeOverridden: false,
              createdBy: userId
            }
          })

          await logPricingSync(
            routingData.id,
            config.id,
            userId,
            'create',
            {
              routingName: routingData.name,
              baseCost: calculatedBaseCost,
              category: routingData.category,
              reason: 'created_during_update'
            }
          )
        }
      }
    }
  } catch (error) {
    console.error('Error syncing routing pricing:', error)
    // Log the error but don't throw to prevent blocking routing operations
    await logPricingSync(
      routingData.id,
      'all',
      userId,
      'error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation
      }
    )
  }
}

/**
 * Log pricing synchronization operations for audit trail
 */
async function logPricingSync(
  routingId: string,
  configurationId: string,
  userId: string,
  action: string,
  metadata: any
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: `pricing_sync_${action}`,
        entityType: 'RoutingPricing',
        entityId: routingId,
        changes: metadata,
        userId,
        metadata: {
          configurationId,
          syncTimestamp: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error('Failed to log pricing sync operation:', error)
    // Don't throw here to avoid cascading failures
  }
}

/**
 * Validate that routing exists and has valid steps before syncing
 */
export async function validateRoutingForSync(routingId: string): Promise<RoutingData | null> {
  try {
    const routing = await prisma.routing.findUnique({
      where: { id: routingId },
      include: {
        steps: {
          include: {
            process: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    if (!routing || routing.steps.length === 0) {
      return null
    }

    // Transform to expected format
    const transformedSteps: RoutingStepData[] = routing.steps.map(step => ({
      processId: step.processId,
      sequence: step.sequence,
      setupTimeMultiplier: step.setupTimeMultiplier,
      runtimeMultiplier: step.runtimeMultiplier,
      notes: step.notes || '',
      setupTime: step.process.setupTime,
      hourlyRate: step.process.hourlyRate,
      minimumCost: step.process.minimumCost,
      complexityMultiplier: step.process.complexityMultiplier
    }))

    return {
      id: routing.id,
      name: routing.name,
      description: routing.description,
      category: routing.category,
      materialMarkup: routing.materialMarkup,
      finishingCost: routing.finishingCost,
      estimatedLeadTime: routing.estimatedLeadTime,
      steps: transformedSteps
    }
  } catch (error) {
    console.error('Error validating routing for sync:', error)
    return null
  }
}

/**
 * Bulk sync all routings to a new pricing configuration
 * Used when creating new configurations to populate with existing routings
 */
export async function bulkSyncRoutingsToConfiguration(
  configurationId: string,
  userId: string
): Promise<void> {
  try {
    // Get all active routings
    const routings = await prisma.routing.findMany({
      where: { active: true },
      include: {
        steps: {
          include: {
            process: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    // Create pricing entries for each routing
    const pricingData = routings.map(routing => {
      const transformedSteps: RoutingStepData[] = routing.steps.map(step => ({
        processId: step.processId,
        sequence: step.sequence,
        setupTimeMultiplier: step.setupTimeMultiplier,
        runtimeMultiplier: step.runtimeMultiplier,
        notes: step.notes || '',
        setupTime: step.process.setupTime,
        hourlyRate: step.process.hourlyRate,
        minimumCost: step.process.minimumCost,
        complexityMultiplier: step.process.complexityMultiplier
      }))

      const calculatedBaseCost = calculateBaseCost(transformedSteps)

      return {
        routingId: routing.id,
        configurationId,
        category: routing.category,
        baseCost: calculatedBaseCost,
        materialMarkup: routing.materialMarkup,
        finishingCost: routing.finishingCost,
        leadTime: routing.estimatedLeadTime,
        isBaseCostOverridden: false,
        isMarkupOverridden: false,
        isFinishingOverridden: false,
        isLeadTimeOverridden: false,
        createdBy: userId
      }
    })

    if (pricingData.length > 0) {
      await prisma.routingPricing.createMany({
        data: pricingData,
        skipDuplicates: true // Prevent errors if some entries already exist
      })

      await logPricingSync(
        'bulk_operation',
        configurationId,
        userId,
        'bulk_sync',
        {
          routingCount: pricingData.length,
          routingIds: pricingData.map(p => p.routingId)
        }
      )
    }
  } catch (error) {
    console.error('Error in bulk sync routings to configuration:', error)
    await logPricingSync(
      'bulk_operation',
      configurationId,
      userId,
      'error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'bulk_sync'
      }
    )
    throw error
  }
}