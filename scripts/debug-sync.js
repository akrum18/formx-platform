#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Import the sync functions - we'll need to check the paths
async function calculateBaseCost(steps, estimatedRuntime = 60) {
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

async function debugSync() {
  console.log('🔍 Debugging Routing-Pricing Sync...\n')
  
  try {
    // 1. Check for active routing
    const routing = await prisma.routing.findFirst({
      where: { active: true },
      include: {
        steps: {
          include: {
            process: true
          }
        }
      }
    })
    
    if (!routing) {
      console.log('❌ No active routing found')
      return
    }
    
    console.log(`✅ Found routing: ${routing.name} (${routing.id})`)
    console.log(`   Steps: ${routing.steps.length}`)
    
    // 2. Check for active pricing configurations
    const configs = await prisma.pricingConfiguration.findMany({
      where: {
        status: { in: ['draft', 'published'] }
      }
    })
    
    console.log(`✅ Found ${configs.length} active pricing configurations`)
    configs.forEach(config => {
      console.log(`   - ${config.id} (${config.status})`)
    })
    
    // 3. Test base cost calculation
    if (routing.steps.length > 0) {
      const transformedSteps = routing.steps.map(step => ({
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
      
      const baseCost = await calculateBaseCost(transformedSteps)
      console.log(`✅ Calculated base cost: $${baseCost.toFixed(2)}`)
    }
    
    // 4. Check existing pricing entries for this routing
    const existingPricing = await prisma.routingPricing.findMany({
      where: { routingId: routing.id },
      include: {
        configuration: true,
        routing: true
      }
    })
    
    console.log(`✅ Found ${existingPricing.length} existing pricing entries for this routing`)
    
    // 5. Test manual sync creation
    if (configs.length > 0 && existingPricing.length === 0) {
      console.log('🔧 Manually creating sync entry...')
      
      const config = configs.find(c => c.status === 'published') || configs[0]
      const transformedSteps = routing.steps.map(step => ({
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
      
      const baseCost = await calculateBaseCost(transformedSteps)
      
      const pricingEntry = await prisma.routingPricing.create({
        data: {
          routingId: routing.id,
          configurationId: config.id,
          category: routing.category,
          baseCost: baseCost,
          materialMarkup: routing.materialMarkup,
          finishingCost: routing.finishingCost,
          leadTime: routing.estimatedLeadTime,
          isBaseCostOverridden: false,
          isMarkupOverridden: false,
          isFinishingOverridden: false,
          isLeadTimeOverridden: false,
          createdBy: 'debug-script'
        }
      })
      
      console.log(`✅ Created pricing entry: ${pricingEntry.id}`)
      console.log(`   Base cost: $${pricingEntry.baseCost}`)
      console.log(`   Material markup: ${pricingEntry.materialMarkup}%`)
      console.log(`   Finishing cost: $${pricingEntry.finishingCost}`)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

debugSync()