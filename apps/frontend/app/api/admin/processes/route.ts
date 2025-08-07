import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Fetch processes directly from database
    const processes = await prisma.process.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        category: true,
        setupTime: true,
        hourlyRate: true,
        minimumCost: true,
        complexityMultiplier: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return NextResponse.json(processes)
  } catch (error) {
    console.error('Error fetching processes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}