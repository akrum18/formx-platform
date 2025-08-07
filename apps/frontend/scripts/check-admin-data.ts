import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking admin data in database...\n')

  try {
    // Check processes
    const processCount = await prisma.process.count()
    console.log(`📊 Processes: ${processCount}`)
    if (processCount > 0) {
      const processes = await prisma.process.findMany({ take: 3 })
      console.log('Sample processes:', processes.map(p => p.name))
    }

    // Check materials
    const materialCount = await prisma.material.count()
    console.log(`📦 Materials: ${materialCount}`)
    if (materialCount > 0) {
      const materials = await prisma.material.findMany({ take: 3 })
      console.log('Sample materials:', materials.map(m => m.name))
    }

    // Check finishes
    const finishCount = await prisma.finish.count()
    console.log(`✨ Finishes: ${finishCount}`)
    if (finishCount > 0) {
      const finishes = await prisma.finish.findMany({ take: 3 })
      console.log('Sample finishes:', finishes.map(f => f.name))
    }

    if (processCount === 0 && materialCount === 0 && finishCount === 0) {
      console.log('\n⚠️  No admin data found in database!')
      console.log('You need to seed the database with processes, materials, and finishes.')
      console.log('You can do this by:')
      console.log('1. Running the admin app and manually adding data')
      console.log('2. Running a seed script if one exists')
    }

  } catch (error) {
    console.error('❌ Error checking data:', error)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })