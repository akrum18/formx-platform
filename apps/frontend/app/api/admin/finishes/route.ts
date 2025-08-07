import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Fetch finishes directly from database
    const finishes = await prisma.finish.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        costPerSqIn: true,
        leadTimeDays: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return NextResponse.json(finishes)
  } catch (error) {
    console.error('Error fetching finishes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch finishes' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}