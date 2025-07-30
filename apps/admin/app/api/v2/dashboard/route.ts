import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireAuth, requirePermission } from '../../../../lib/auth'

function getRecentCount(items: any[], days: number = 30): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return items.filter(item => {
    const itemDate = new Date(item.createdAt || item.publishedAt)
    return itemDate >= cutoffDate
  }).length
}

function getLastUpdateInfo(items: any[]): string {
  if (items.length === 0) return "No items"
  
  const sortedItems = items
    .filter(item => item.createdAt || item.publishedAt || item.updatedAt)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.publishedAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt || b.publishedAt).getTime()
      return dateB - dateA
    })
  
  if (sortedItems.length === 0) return "No recent updates"
  
  const lastUpdate = new Date(sortedItems[0].updatedAt || sortedItems[0].createdAt || sortedItems[0].publishedAt)
  const daysAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysAgo === 0) return "Updated today"
  if (daysAgo === 1) return "Updated yesterday"
  if (daysAgo < 7) return `Updated ${daysAgo} days ago`
  if (daysAgo < 30) return `Updated ${Math.floor(daysAgo / 7)} weeks ago`
  return `Updated ${Math.floor(daysAgo / 30)} months ago`
}

export const GET = requirePermission('dashboard', async (request: NextRequest, user: any) => {
  try {
    // Fetch real data from Prisma
    const [
      materials,
      processes,
      routings,
      finishes,
      featureFlags,
      pricingConfigurations
    ] = await Promise.all([
      prisma.material.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.process.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.routing.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.finish.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.featureFlag.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.pricingConfiguration.findMany({ orderBy: { createdAt: 'desc' } })
    ])

    // Calculate statistics
    const materialsCount = materials.length
    const processesCount = processes.length
    const routingsCount = routings.length
    const finishesCount = finishes.length
    const featureFlagsCount = featureFlags.length
    const enabledFeaturesCount = featureFlags.filter(f => f.enabled).length
    
    // Get current version
    const currentVersion = pricingConfigurations.find(v => v.status === 'published') || pricingConfigurations[0]
    const draftVersions = pricingConfigurations.filter(v => v.status === 'draft').length
    
    // Calculate recent activity
    const recentMaterials = getRecentCount(materials)
    const recentProcesses = getRecentCount(processes)
    const recentFinishes = getRecentCount(finishes)
    
    const dashboardData = {
      // Main statistics
      stats: {
        materials: {
          total: materialsCount,
          recent: recentMaterials,
          lastUpdate: getLastUpdateInfo(materials)
        },
        processes: {
          total: processesCount,
          recent: recentProcesses,
          lastUpdate: getLastUpdateInfo(processes)
        },
        routings: {
          total: routingsCount,
          recent: getRecentCount(routings),
          lastUpdate: getLastUpdateInfo(routings)
        },
        finishes: {
          total: finishesCount,
          recent: recentFinishes,
          lastUpdate: getLastUpdateInfo(finishes)
        },
        featureFlags: {
          total: featureFlagsCount,
          enabled: enabledFeaturesCount,
          experimental: featureFlags.filter(f => f.category === 'Experimental').length
        },
        versions: {
          current: currentVersion ? `v${currentVersion.version}.0` : 'None',
          status: currentVersion?.status || 'unpublished',
          drafts: draftVersions,
          publishedAt: currentVersion?.updatedAt?.toISOString() || null
        }
      },
      
      // Section data for cards
      sections: [
        {
          title: "Materials",
          count: `${materialsCount} materials`,
          status: materialsCount > 0 ? "Active" : "Empty",
          lastUpdate: getLastUpdateInfo(materials)
        },
        {
          title: "Processes",
          count: `${processesCount} processes`,
          status: recentProcesses > 0 ? "Updated" : "Active",
          lastUpdate: getLastUpdateInfo(processes)
        },
        {
          title: "Routings",
          count: `${routingsCount} routings`,
          status: routingsCount > 0 ? "Active" : "Empty",
          lastUpdate: getLastUpdateInfo(routings)
        },
        {
          title: "Finishes & Coatings",
          count: `${finishesCount} finishes`,
          status: finishesCount > 0 ? "Active" : "Empty",
          lastUpdate: getLastUpdateInfo(finishes)
        },
        {
          title: "Margins & Pricing",
          count: "3 tiers",
          status: "Configured",
          lastUpdate: "Always active"
        },
        {
          title: "Feature Flags",
          count: `${featureFlagsCount} features`,
          status: "Monitoring",
          lastUpdate: `${enabledFeaturesCount} enabled`
        },
        {
          title: "Pricing Versions",
          count: currentVersion ? `v${currentVersion.version}.0` : "No version",
          status: currentVersion?.status === 'published' ? "Published" : "Draft",
          lastUpdate: currentVersion?.updatedAt ? getLastUpdateInfo([currentVersion]) : "Never published"
        }
      ],
      
      // Activity summary
      activity: {
        totalItems: materialsCount + processesCount + routingsCount + finishesCount,
        recentActivity: recentMaterials + recentProcesses + recentFinishes,
        systemHealth: "Operational"
      },
      
      // Generated timestamp
      generatedAt: new Date().toISOString()
    }
    
    console.log('📊 Generated dashboard data from database:', {
      totalItems: dashboardData.activity.totalItems,
      recentActivity: dashboardData.activity.recentActivity,
      currentVersion: dashboardData.stats.versions.current
    })
    
    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('GET /api/v2/dashboard error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
      { status: 500 }
    )
  }
})