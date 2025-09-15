#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Step 1: Create system user for seeding
    console.log('👤 Creating system user...')
    const systemUser = await prisma.user.upsert({
      where: { email: 'system@formx.com' },
      update: {},
      create: {
        email: 'system@formx.com',
        name: 'System Seeding User',
        role: 'admin',
        permissions: ['admin:all'],
        password: await bcrypt.hash('system-user-password', 10),
        disabled: true, // Disabled for security
        version: 1
      }
    })

    // Step 2: Create test admin user
    console.log('🔐 Creating test admin user...')
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@formx.com' },
      update: {},
      create: {
        email: 'admin@formx.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['admin:all'],
        password: await bcrypt.hash('admin123', 10),
        disabled: false,
        version: 1
      }
    })

    // Step 3: Seed Finishes
    console.log('🎨 Seeding finishes...')
    const finishData = [
      {
        name: 'Anodized Clear',
        type: 'Anodizing',
        costPerSqIn: 0.15,
        leadTimeDays: 3,
        description: 'Clear anodized finish for aluminum parts',
        active: true
      },
      {
        name: 'Black Oxide',
        type: 'Chemical',
        costPerSqIn: 0.08,
        leadTimeDays: 2,
        description: 'Black oxide coating for steel parts',
        active: true
      },
      {
        name: 'Powder Coat Black',
        type: 'Powder Coating',
        costPerSqIn: 0.25,
        leadTimeDays: 5,
        description: 'Durable powder coat finish',
        active: true
      },
      {
        name: 'Zinc Plating',
        type: 'Plating',
        costPerSqIn: 0.12,
        leadTimeDays: 4,
        description: 'Corrosion resistant zinc plating',
        active: true
      },
      {
        name: 'Chrome Plating',
        type: 'Plating',
        costPerSqIn: 0.35,
        leadTimeDays: 7,
        description: 'High-quality chrome finish',
        active: true
      },
      {
        name: 'Sandblasting',
        type: 'Surface Prep',
        costPerSqIn: 0.06,
        leadTimeDays: 1,
        description: 'Surface preparation and texturing',
        active: true
      }
    ]

    const createdFinishes = []
    for (const finish of finishData) {
      const existing = await prisma.finish.findFirst({
        where: { name: finish.name }
      })
      
      if (!existing) {
        const created = await prisma.finish.create({
          data: {
            ...finish,
            createdBy: systemUser.id,
            version: 1
          }
        })
        createdFinishes.push(created)
      } else {
        createdFinishes.push(existing)
      }
    }

    // Step 4: Seed Materials
    console.log('🧱 Seeding materials...')
    const materialData = [
      {
        name: 'Aluminum 6061',
        cost: 3.50,
        markup: 1.25,
        density: 2.70,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'Steel 1018',
        cost: 2.80,
        markup: 1.20,
        density: 7.87,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'Stainless Steel 304',
        cost: 4.20,
        markup: 1.30,
        density: 8.00,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'ABS Plastic',
        cost: 4.20,
        markup: 1.30,
        density: 1.04,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'PLA Plastic',
        cost: 3.80,
        markup: 1.25,
        density: 1.24,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'Brass',
        cost: 6.50,
        markup: 1.40,
        density: 8.50,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'Copper',
        cost: 7.20,
        markup: 1.35,
        density: 8.96,
        unit: 'g/cm³',
        active: true
      },
      {
        name: 'Titanium',
        cost: 32.00,
        markup: 1.60,
        density: 4.51,
        unit: 'g/cm³',
        active: true
      }
    ]

    const createdMaterials = []
    for (const material of materialData) {
      const existing = await prisma.material.findFirst({
        where: { name: material.name }
      })
      
      if (!existing) {
        const created = await prisma.material.create({
          data: {
            ...material,
            createdBy: systemUser.id,
            version: 1
          }
        })
        createdMaterials.push(created)
      } else {
        createdMaterials.push(existing)
      }
    }

    // Step 5: Seed Processes
    console.log('⚙️  Seeding processes...')
    const processData = [
      {
        name: 'CNC Machining',
        setupTime: 30,
        hourlyRate: 85.00,
        minimumCost: 25.00,
        complexityMultiplier: 1.2,
        active: true,
        category: 'Subtractive'
      },
      {
        name: 'Laser Cutting',
        setupTime: 15,
        hourlyRate: 60.00,
        minimumCost: 15.00,
        complexityMultiplier: 1.1,
        active: true,
        category: 'Cutting'
      },
      {
        name: '3D Printing',
        setupTime: 10,
        hourlyRate: 45.00,
        minimumCost: 10.00,
        complexityMultiplier: 1.0,
        active: true,
        category: 'Additive'
      },
      {
        name: 'Waterjet Cutting',
        setupTime: 20,
        hourlyRate: 75.00,
        minimumCost: 20.00,
        complexityMultiplier: 1.15,
        active: true,
        category: 'Cutting'
      },
      {
        name: 'EDM Wire',
        setupTime: 45,
        hourlyRate: 95.00,
        minimumCost: 35.00,
        complexityMultiplier: 1.4,
        active: true,
        category: 'Subtractive'
      },
      {
        name: 'Turning',
        setupTime: 20,
        hourlyRate: 70.00,
        minimumCost: 18.00,
        complexityMultiplier: 1.1,
        active: true,
        category: 'Subtractive'
      },
      {
        name: 'Milling',
        setupTime: 25,
        hourlyRate: 80.00,
        minimumCost: 22.00,
        complexityMultiplier: 1.25,
        active: true,
        category: 'Subtractive'
      },
      {
        name: 'Injection Molding',
        setupTime: 120,
        hourlyRate: 35.00,
        minimumCost: 50.00,
        complexityMultiplier: 0.8,
        active: true,
        category: 'Molding'
      }
    ]

    const createdProcesses = []
    for (const process of processData) {
      const existing = await prisma.process.findFirst({
        where: { name: process.name }
      })
      
      if (!existing) {
        const created = await prisma.process.create({
          data: {
            ...process,
            createdBy: systemUser.id,
            version: 1
          }
        })
        createdProcesses.push(created)
      } else {
        createdProcesses.push(existing)
      }
    }

    // Step 6: Connect Materials and Processes (many-to-many relationship)
    console.log('🔗 Connecting materials to processes...')
    
    const aluminumMaterial = createdMaterials.find(m => m.name === 'Aluminum 6061')
    const steelMaterial = createdMaterials.find(m => m.name === 'Steel 1018')
    const absMaterial = createdMaterials.find(m => m.name === 'ABS Plastic')
    
    // Get process IDs
    const cncProcess = createdProcesses.find(p => p.name === 'CNC Machining')
    const laserProcess = createdProcesses.find(p => p.name === 'Laser Cutting')
    const waterjetsProcess = createdProcesses.find(p => p.name === 'Waterjet Cutting')
    const edmProcess = createdProcesses.find(p => p.name === 'EDM Wire')
    const turningProcess = createdProcesses.find(p => p.name === 'Turning')
    const millingProcess = createdProcesses.find(p => p.name === 'Milling')
    const printingProcess = createdProcesses.find(p => p.name === '3D Printing')
    const moldingProcess = createdProcesses.find(p => p.name === 'Injection Molding')

    // Aluminum 6061 can be used with most processes
    if (aluminumMaterial) {
      await prisma.material.update({
        where: { id: aluminumMaterial.id },
        data: {
          processes: {
            connect: [
              cncProcess && { id: cncProcess.id },
              laserProcess && { id: laserProcess.id },
              waterjetsProcess && { id: waterjetsProcess.id },
              turningProcess && { id: turningProcess.id },
              millingProcess && { id: millingProcess.id }
            ].filter(Boolean)
          }
        }
      })
    }

    // Steel 1018 for machining processes
    if (steelMaterial) {
      await prisma.material.update({
        where: { id: steelMaterial.id },
        data: {
          processes: {
            connect: [
              cncProcess && { id: cncProcess.id },
              laserProcess && { id: laserProcess.id },
              waterjetsProcess && { id: waterjetsProcess.id },
              edmProcess && { id: edmProcess.id },
              turningProcess && { id: turningProcess.id },
              millingProcess && { id: millingProcess.id }
            ].filter(Boolean)
          }
        }
      })
    }

    // ABS Plastic for 3D printing and injection molding
    if (absMaterial) {
      await prisma.material.update({
        where: { id: absMaterial.id },
        data: {
          processes: {
            connect: [
              printingProcess && { id: printingProcess.id },
              moldingProcess && { id: moldingProcess.id },
              cncProcess && { id: cncProcess.id }
            ].filter(Boolean)
          }
        }
      })
    }

    // Step 7: Seed Routings
    console.log('🔄 Seeding routings...')
    const routingData = [
      {
        name: 'Standard CNC Route',
        description: 'Standard CNC machining routing for precision parts',
        category: 'Machining',
        totalSetupTime: 45,
        estimatedLeadTime: 5,
        active: true,
        materialMarkup: 1.25,
        finishingCost: 12.50,
        isPrimaryPricingRoute: true,
        finishId: createdFinishes.find(f => f.name === 'Anodized Clear')?.id
      },
      {
        name: 'Laser Cut Route',
        description: 'Standard laser cutting routing for sheet metal',
        category: 'Cutting',
        totalSetupTime: 20,
        estimatedLeadTime: 2,
        active: true,
        materialMarkup: 1.15,
        finishingCost: 8.00,
        isPrimaryPricingRoute: false,
        finishId: createdFinishes.find(f => f.name === 'Black Oxide')?.id
      },
      {
        name: '3D Printing Route',
        description: 'Additive manufacturing for prototypes',
        category: 'Additive',
        totalSetupTime: 10,
        estimatedLeadTime: 3,
        active: true,
        materialMarkup: 1.10,
        finishingCost: 5.00,
        isPrimaryPricingRoute: false,
        finishId: null
      },
      {
        name: 'Precision EDM Route',
        description: 'High precision EDM machining for complex geometries',
        category: 'EDM',
        totalSetupTime: 60,
        estimatedLeadTime: 10,
        active: true,
        materialMarkup: 1.35,
        finishingCost: 20.00,
        isPrimaryPricingRoute: false,
        finishId: createdFinishes.find(f => f.name === 'Sandblasting')?.id
      }
    ]

    const createdRoutings = []
    for (const routing of routingData) {
      const existing = await prisma.routing.findFirst({
        where: { name: routing.name }
      })
      
      if (!existing) {
        const created = await prisma.routing.create({
          data: {
            ...routing,
            createdBy: systemUser.id,
            version: 1
          }
        })
        createdRoutings.push(created)
      } else {
        createdRoutings.push(existing)
      }
    }

    // Step 8: Seed Routing Steps
    console.log('📋 Seeding routing steps...')
    const routingStepsData = [
      // CNC Route steps
      {
        routingName: 'Standard CNC Route',
        processName: 'CNC Machining',
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: 'Primary machining operation'
      },
      // Laser Route steps
      {
        routingName: 'Laser Cut Route',
        processName: 'Laser Cutting',
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: 'Laser cutting operation'
      },
      // 3D Printing Route steps
      {
        routingName: '3D Printing Route',
        processName: '3D Printing',
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.2,
        notes: 'FDM printing with support removal'
      },
      // EDM Route steps
      {
        routingName: 'Precision EDM Route',
        processName: 'EDM Wire',
        sequence: 1,
        setupTimeMultiplier: 1.2,
        runtimeMultiplier: 1.5,
        notes: 'Precision wire EDM cutting'
      }
    ]

    for (const stepData of routingStepsData) {
      const routing = createdRoutings.find(r => r.name === stepData.routingName)
      const process = createdProcesses.find(p => p.name === stepData.processName)
      
      if (routing && process) {
        await prisma.routingStep.create({
          data: {
            routingId: routing.id,
            processId: process.id,
            processName: process.name,
            sequence: stepData.sequence,
            setupTimeMultiplier: stepData.setupTimeMultiplier,
            runtimeMultiplier: stepData.runtimeMultiplier,
            notes: stepData.notes,
            setupTime: process.setupTime,
            hourlyRate: process.hourlyRate,
            minimumCost: process.minimumCost,
            complexityMultiplier: process.complexityMultiplier,
            createdBy: systemUser.id,
            version: 1
          }
        })
      }
    }

    // Step 9: Seed Pricing Configuration
    console.log('💰 Seeding pricing configuration...')
    const existingPricingConfig = await prisma.pricingConfiguration.findUnique({
      where: { id: 'default-pricing-config' }
    })
    
    const pricingConfig = existingPricingConfig || await prisma.pricingConfiguration.create({
      data: {
        id: 'default-pricing-config',
        defaultTierMultipliers: {
          economy: 0.85,
          standard: 1.0,
          rush: 1.35
        },
        volumeBreaks: [
          { minQuantity: 1, maxQuantity: 10, discountPercent: 0 },
          { minQuantity: 11, maxQuantity: 50, discountPercent: 5 },
          { minQuantity: 51, maxQuantity: 100, discountPercent: 10 },
          { minQuantity: 101, maxQuantity: null, discountPercent: 15 }
        ],
        minimumOrderValue: 25.00,
        status: 'published',
        createdBy: systemUser.id,
        version: 1
      }
    })

    // Step 10: Seed Routing Pricing for each routing
    console.log('🏷️  Seeding routing pricing...')
    for (const routing of createdRoutings) {
      await prisma.routingPricing.create({
        data: {
          routingId: routing.id,
          category: routing.category,
          baseCost: routing.category === 'Machining' ? 50.0 : 
                    routing.category === 'Cutting' ? 25.0 :
                    routing.category === 'Additive' ? 15.0 : 75.0,
          materialMarkup: routing.materialMarkup,
          finishingCost: routing.finishingCost,
          leadTime: routing.estimatedLeadTime,
          tierOverrides: null,
          configurationId: pricingConfig.id,
          isBaseCostOverridden: false,
          isFinishingOverridden: false,
          isLeadTimeOverridden: false,
          isMarkupOverridden: false,
          createdBy: systemUser.id,
          version: 1
        }
      })
    }

    // Step 11: Seed Feature Flags
    console.log('🚩 Seeding feature flags...')
    const featureFlagData = [
      {
        name: 'rush-orders',
        description: 'Enable rush order pricing and scheduling',
        enabled: true,
        rolloutPercentage: 100,
        category: 'pricing'
      },
      {
        name: 'coating-options',
        description: 'Enable coating and finishing options',
        enabled: true,
        rolloutPercentage: 100,
        category: 'manufacturing'
      },
      {
        name: 'volume-discounts',
        description: 'Enable volume-based discount tiers',
        enabled: true,
        rolloutPercentage: 100,
        category: 'pricing'
      },
      {
        name: 'real-time-quotes',
        description: 'Enable real-time quote generation',
        enabled: true,
        rolloutPercentage: 80,
        category: 'features'
      },
      {
        name: 'advanced-materials',
        description: 'Enable advanced material options like titanium',
        enabled: false,
        rolloutPercentage: 25,
        category: 'manufacturing'
      }
    ]

    for (const flag of featureFlagData) {
      const existing = await prisma.featureFlag.findFirst({
        where: { name: flag.name }
      })
      
      if (!existing) {
        await prisma.featureFlag.create({
          data: flag
        })
      }
    }

    // Step 12: Create sample test customer and parts (for frontend testing)
    console.log('👥 Creating sample customer data...')
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: 'john.smith@acme.com' }
    })
    
    const testCustomer = existingCustomer || await prisma.customer.create({
      data: {
        name: 'John Smith',
        email: 'john.smith@acme.com',
        phone: '(555) 123-4567',
        company: 'Acme Engineering',
        paymentStatus: 'Good Standing',
        createdBy: systemUser.id,
        version: 1
      }
    })

    // Create sample parts for testing
    const sampleParts = []
    for (let i = 0; i < 5; i++) {
      const material = createdMaterials[i % createdMaterials.length]
      const process = createdProcesses[i % createdProcesses.length]
      const finish = i < 3 ? createdFinishes[i] : null
      
      const part = await prisma.part.create({
        data: {
          partName: `Sample Part ${i + 1}`,
          quantity: 10 + i * 5,
          tolerance: i === 0 ? 'Standard' : i === 1 ? 'Tight' : 'Custom',
          fileName: `sample_part_${i + 1}.step`,
          fileSize: 1024 * (i + 1),
          fileType: 'application/step',
          fileUrl: `/uploads/sample_part_${i + 1}.step`,
          processId: process.id,
          materialId: material.id,
          finishId: finish?.id,
          routingId: createdRoutings[i % createdRoutings.length].id,
          createdBy: systemUser.id,
          version: 1
        }
      })
      sampleParts.push(part)
    }

    console.log('✅ Database seeding completed successfully!')
    console.log('')
    console.log('📊 Seeded data summary:')
    console.log(`- Users: 2 (1 admin, 1 system)`)
    console.log(`- Finishes: ${finishData.length}`)
    console.log(`- Materials: ${materialData.length}`)
    console.log(`- Processes: ${processData.length}`)
    console.log(`- Routings: ${routingData.length}`)
    console.log(`- Routing Steps: ${routingStepsData.length}`)
    console.log(`- Feature Flags: ${featureFlagData.length}`)
    console.log(`- Customers: 1`)
    console.log(`- Sample Parts: ${sampleParts.length}`)
    console.log(`- Pricing Configuration: 1 (published)`)
    console.log('')
    console.log('🔑 Test login credentials:')
    console.log('   Email: admin@formx.com')
    console.log('   Password: admin123')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  }
}

async function main() {
  console.log('🌱 FormX Database Seeding Script')
  console.log('=================================')
  
  await seedDatabase()
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })