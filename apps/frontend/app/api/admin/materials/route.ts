import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Fetch materials directly from database
    const materials = await prisma.material.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        cost: true,
        markup: true,
        density: true,
        unit: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}