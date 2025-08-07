"use client"

import { useDashboardData } from "@/lib/api/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Package, Clock } from "lucide-react"
import DashboardStats from "@/components/dashboard/dashboard-stats"
import ActiveRFQs from "@/components/dashboard/active-rfqs"
import ActiveQuotes from "@/components/dashboard/active-quotes"
import OrderHistory from "@/components/dashboard/order-history"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface User {
  id: string
  name: string
  email: string
  type: string
}

interface DashboardClientProps {
  user: User
}

export default function DashboardClient({ user }: DashboardClientProps) {
  // For now, using the user ID as customer ID
  // In a real app, you'd get the customer ID from the user profile or context
  const customerId = user.id
  
  const { data: dashboardData, isLoading, error } = useDashboardData(customerId)

  if (isLoading) {
    return (
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-dark-grey mb-2">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your manufacturing projects</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-dark-grey mb-2">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your manufacturing projects</p>
        </div>

        <Alert variant="destructive">
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
            {error instanceof Error && (
              <details className="mt-2">
                <summary className="cursor-pointer">Error details</summary>
                <p className="text-sm mt-1">{error.message}</p>
              </details>
            )}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!dashboardData) {
    return (
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-dark-grey mb-2">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your manufacturing projects</p>
        </div>

        <Alert>
          <AlertDescription>
            No dashboard data available. This might be your first visit!
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  const { stats, rfqs, quotes, orders } = dashboardData

  return (
    <main className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-dark-grey mb-2">Welcome back, {user.name}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your manufacturing projects</p>
      </div>

      <div className="mb-8">
        <DashboardStats data={stats} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest RFQs, quotes, and orders</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="rfqs" className="w-full">
            <div className="px-6 border-b">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="rfqs"
                  className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-brand-dark-gold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Active RFQs ({rfqs.length})
                </TabsTrigger>
                <TabsTrigger
                  value="quotes"
                  className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-brand-dark-gold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Active Quotes ({quotes.length})
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-brand-dark-gold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Recent Orders ({orders.length})
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="rfqs" className="p-0">
              <ActiveRFQs rfqs={rfqs} />
            </TabsContent>
            <TabsContent value="quotes" className="p-0">
              <ActiveQuotes quotes={quotes} />
            </TabsContent>
            <TabsContent value="orders" className="p-0">
              <OrderHistory orders={orders} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}