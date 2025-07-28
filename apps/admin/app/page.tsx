"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Wrench, Palette, DollarSign, ToggleLeft, GitBranch, Route, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useDashboardData } from "@/lib/api/dashboard"

export default function HomePage() {
  // API Hooks
  const { data: dashboardData, isLoading, error } = useDashboardData()

  const sectionConfigs = [
    {
      title: "Materials",
      description: "Manage materials, costs, markups, and process compatibility",
      icon: Package,
      href: "/materials",
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Processes",
      description: "Configure setup times, hourly rates, and complexity multipliers",
      icon: Wrench,
      href: "/processes",
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Routings",
      description: "Build multi-step fabrication workflows and process sequences",
      icon: Route,
      href: "/routings",
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      title: "Finishes & Coatings",
      description: "Add and edit finish types with costs and lead times",
      icon: Palette,
      href: "/finishes",
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Margins & Pricing",
      description: "Set global markups and pricing strategy parameters",
      icon: DollarSign,
      href: "/margins",
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Feature Flags",
      description: "Control quoting modules and experimental features",
      icon: ToggleLeft,
      href: "/features",
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Pricing Versions",
      description: "Manage draft and published pricing configurations",
      icon: GitBranch,
      href: "/versions",
      color: "bg-slate-100 text-slate-600",
    },
  ]

  // Merge section configs with API data
  const sections = sectionConfigs.map(config => {
    const sectionData = dashboardData?.sections.find(s => s.title === config.title)
    return {
      ...config,
      count: sectionData?.count || "Loading...",
      status: sectionData?.status || "Unknown",
    }
  })

  const stats = dashboardData ? [
    {
      title: "Active Materials",
      value: dashboardData.stats.materials.total.toString(),
      change: dashboardData.stats.materials.recent > 0 
        ? `+${dashboardData.stats.materials.recent} this month` 
        : dashboardData.stats.materials.lastUpdate,
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Manufacturing Processes",
      value: dashboardData.stats.processes.total.toString(),
      change: dashboardData.stats.processes.recent > 0
        ? `${dashboardData.stats.processes.recent} updated recently`
        : dashboardData.stats.processes.lastUpdate,
      icon: Wrench,
      color: "text-blue-600",
    },
    {
      title: "Current Version",
      value: dashboardData.stats.versions.current,
      change: dashboardData.stats.versions.publishedAt 
        ? `Published ${new Date(dashboardData.stats.versions.publishedAt).toLocaleDateString()}`
        : "No published version",
      icon: GitBranch,
      color: "text-purple-600",
    },
  ] : []

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 w-10" />
              <div className="space-y-1">
                <Skeleton className="h-10 w-96" />
                <Skeleton className="h-6 w-[600px]" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              Failed to load dashboard data: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header with Sidebar Toggle */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl p-2 shadow-sm" />
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">Manufacturing Admin Panel</h1>
              <p className="text-lg text-slate-600">
                Configure pricing structures and quoting capabilities for the manufacturing platform
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className={`text-sm font-medium ${stat.color}`}>{stat.change}</p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      stat.color === "text-green-600"
                        ? "bg-green-100"
                        : stat.color === "text-blue-600"
                          ? "bg-blue-100"
                          : "bg-purple-100"
                    }`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Configuration Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link key={section.title} href={section.href}>
              <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${section.color} group-hover:scale-110 transition-transform duration-200`}
                    >
                      <section.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                      {section.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-3">
                    <span className="text-sm font-medium text-slate-500">{section.count}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-0 rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/materials"
                className="flex items-center gap-3 p-4 bg-white rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Package className="h-5 w-5 text-green-600" />
                <span className="font-medium text-slate-900">Add Material</span>
              </Link>
              <Link
                href="/processes"
                className="flex items-center gap-3 p-4 bg-white rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Wrench className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-slate-900">Add Process</span>
              </Link>
              <Link
                href="/routings"
                className="flex items-center gap-3 p-4 bg-white rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Route className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-slate-900">Create Routing</span>
              </Link>
              <Link
                href="/margins"
                className="flex items-center gap-3 p-4 bg-white rounded-xl hover:bg-slate-50 transition-colors"
              >
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-slate-900">Update Pricing</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
