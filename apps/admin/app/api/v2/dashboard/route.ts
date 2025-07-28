import { NextRequest, NextResponse } from 'next/server'

// Import mock data from other modules to calculate real statistics
const mockMaterials = [
  { id: "1", name: "Aluminum 6061-T6", type: "Metal", supplier: "MetalCorp", density: 2.7, cost: 3.5, createdAt: "2024-01-15T08:00:00Z" },
  { id: "2", name: "Steel 304", type: "Metal", supplier: "SteelWorks", density: 8.0, cost: 2.8, createdAt: "2024-01-10T09:15:00Z" },
  { id: "3", name: "ABS Plastic", type: "Plastic", supplier: "PlastiCorp", density: 1.05, cost: 1.2, createdAt: "2024-01-20T11:30:00Z" },
  { id: "4", name: "Carbon Fiber", type: "Composite", supplier: "CompositeTech", density: 1.6, cost: 25.0, createdAt: "2024-01-25T14:45:00Z" },
  { id: "5", name: "Titanium Grade 2", type: "Metal", supplier: "TitaniumPro", density: 4.5, cost: 35.0, createdAt: "2024-01-12T16:20:00Z" },
]

const mockProcesses = [
  { id: "1", name: "CNC Milling", category: "Primary", hourlyRate: 125, setupTime: 30, createdAt: "2024-01-15T08:00:00Z" },
  { id: "2", name: "CNC Turning", category: "Primary", hourlyRate: 110, setupTime: 25, createdAt: "2024-01-18T10:30:00Z" },
  { id: "3", name: "Wire EDM", category: "Secondary", hourlyRate: 95, setupTime: 45, createdAt: "2024-01-10T14:15:00Z" },
  { id: "4", name: "Surface Grinding", category: "Secondary", hourlyRate: 85, setupTime: 20, createdAt: "2024-01-22T09:45:00Z" },
]

const mockRoutings = [
  { id: "1", name: "Standard Machining", description: "Basic CNC operations", createdAt: "2024-01-15T08:00:00Z" },
  { id: "2", name: "Precision Routing", description: "High-precision multi-step process", createdAt: "2024-01-20T11:30:00Z" },
  { id: "3", name: "Complex Assembly", description: "Multi-stage fabrication workflow", createdAt: "2024-01-25T16:20:00Z" },
]

const mockFinishes = [
  { id: "1", name: "Anodizing Type II", type: "Anodizing", costPerSqIn: 0.5, leadTimeDays: 7, createdAt: "2024-01-15T08:00:00Z" },
  { id: "2", name: "Powder Coating", type: "Powder Coating", costPerSqIn: 0.3, leadTimeDays: 3, createdAt: "2024-01-18T10:30:00Z" },
  { id: "3", name: "Zinc Plating", type: "Plating", costPerSqIn: 0.4, leadTimeDays: 5, createdAt: "2024-01-10T14:15:00Z" },
]

const mockFeatureFlags = [
  { id: "5axis-cnc", name: "5-Axis CNC Quoting", enabled: true, category: "Processes", createdAt: "2024-01-15T08:00:00Z" },
  { id: "coating-options", name: "Coating & Finishing Options", enabled: true, category: "Finishes", createdAt: "2024-01-10T09:15:00Z" },
  { id: "rush-orders", name: "Rush Order Pricing", enabled: true, category: "Pricing", createdAt: "2024-01-12T11:45:00Z" },
  { id: "volume-discounts", name: "Volume Discount Display", enabled: false, category: "Pricing", createdAt: "2024-01-18T13:20:00Z" },
  { id: "material-suggestions", name: "Material Suggestions", enabled: false, category: "Experimental", createdAt: "2024-01-20T15:30:00Z" },
  { id: "instant-quotes", name: "Instant Quote Generation", enabled: false, category: "Experimental", createdAt: "2024-01-22T10:00:00Z" },
]

const mockVersions = [
  { id: "1", version: "v2.0", status: "archived", publishedAt: "2024-01-10T08:00:00Z" },
  { id: "2", version: "v2.1", status: "published", publishedAt: "2024-01-23T14:30:00Z" },
  { id: "3", version: "v2.2", status: "draft", publishedAt: null },
]

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
    .filter(item => item.createdAt || item.publishedAt)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.publishedAt).getTime()
      const dateB = new Date(b.createdAt || b.publishedAt).getTime()
      return dateB - dateA
    })
  
  if (sortedItems.length === 0) return "No recent updates"
  
  const lastUpdate = new Date(sortedItems[0].createdAt || sortedItems[0].publishedAt)
  const daysAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysAgo === 0) return "Updated today"
  if (daysAgo === 1) return "Updated yesterday"
  if (daysAgo < 7) return `Updated ${daysAgo} days ago`
  if (daysAgo < 30) return `Updated ${Math.floor(daysAgo / 7)} weeks ago`
  return `Updated ${Math.floor(daysAgo / 30)} months ago`
}

export async function GET(request: NextRequest) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Calculate real statistics from mock data
    const materialsCount = mockMaterials.length
    const processesCount = mockProcesses.length
    const routingsCount = mockRoutings.length
    const finishesCount = mockFinishes.length
    const featureFlagsCount = mockFeatureFlags.length
    const enabledFeaturesCount = mockFeatureFlags.filter(f => f.enabled).length
    
    // Get current version
    const currentVersion = mockVersions.find(v => v.status === 'published') || mockVersions[0]
    const draftVersions = mockVersions.filter(v => v.status === 'draft').length
    
    // Calculate recent activity
    const recentMaterials = getRecentCount(mockMaterials)
    const recentProcesses = getRecentCount(mockProcesses)
    const recentFinishes = getRecentCount(mockFinishes)
    
    const dashboardData = {
      // Main statistics
      stats: {
        materials: {
          total: materialsCount,
          recent: recentMaterials,
          lastUpdate: getLastUpdateInfo(mockMaterials)
        },
        processes: {
          total: processesCount,
          recent: recentProcesses,
          lastUpdate: getLastUpdateInfo(mockProcesses)
        },
        routings: {
          total: routingsCount,
          recent: getRecentCount(mockRoutings),
          lastUpdate: getLastUpdateInfo(mockRoutings)
        },
        finishes: {
          total: finishesCount,
          recent: recentFinishes,
          lastUpdate: getLastUpdateInfo(mockFinishes)
        },
        featureFlags: {
          total: featureFlagsCount,
          enabled: enabledFeaturesCount,
          experimental: mockFeatureFlags.filter(f => f.category === 'Experimental').length
        },
        versions: {
          current: currentVersion?.version || 'None',
          status: currentVersion?.status || 'unpublished',
          drafts: draftVersions,
          publishedAt: currentVersion?.publishedAt || null
        }
      },
      
      // Section data for cards
      sections: [
        {
          title: "Materials",
          count: `${materialsCount} materials`,
          status: materialsCount > 0 ? "Active" : "Empty",
          lastUpdate: getLastUpdateInfo(mockMaterials)
        },
        {
          title: "Processes",
          count: `${processesCount} processes`,
          status: recentProcesses > 0 ? "Updated" : "Active",
          lastUpdate: getLastUpdateInfo(mockProcesses)
        },
        {
          title: "Routings",
          count: `${routingsCount} routings`,
          status: routingsCount > 0 ? "Active" : "Empty",
          lastUpdate: getLastUpdateInfo(mockRoutings)
        },
        {
          title: "Finishes & Coatings",
          count: `${finishesCount} finishes`,
          status: finishesCount > 0 ? "Active" : "Empty",
          lastUpdate: getLastUpdateInfo(mockFinishes)
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
          count: currentVersion?.version || "No version",
          status: currentVersion?.status === 'published' ? "Published" : "Draft",
          lastUpdate: currentVersion?.publishedAt ? getLastUpdateInfo([currentVersion]) : "Never published"
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
    
    console.log('📊 Generated dashboard data (DEMO):', {
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
}