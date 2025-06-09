import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Package, Clock } from "lucide-react"
import DashboardStats from "@/components/dashboard/dashboard-stats"
import ActiveRFQs from "@/components/dashboard/active-rfqs"
import ActiveQuotes from "@/components/dashboard/active-quotes"
import OrderHistory from "@/components/dashboard/order-history"
import { cookies } from "next/headers" // Import cookies

export const metadata: Metadata = {
  title: "Dashboard | Form(X)",
  description: "Manufacturing quote and order management dashboard",
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function getDashboardData() {
  const cookieStore = cookies()
  const authToken = cookieStore.get("auth_token")?.value

  if (!authToken) {
    // If no auth token, redirect to login (handled by getCurrentUser already, but good to be explicit)
    redirect("/auth/login")
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      // Ensure no-store to always fetch fresh data on server-side
      cache: "no-store", 
    })

    if (!response.ok) {
      // Handle API errors, e.g., 401 Unauthorized, 403 Forbidden
      if (response.status === 401 || response.status === 403) {
        console.error("Authentication error fetching dashboard data:", response.status)
        // Optionally clear cookies and redirect to login if token is invalid/expired
        cookieStore.delete("auth_token")
        cookieStore.delete("user_type")
        redirect("/auth/login")
      }
      const errorData = await response.json()
      console.error("Failed to fetch dashboard data:", errorData.error || response.statusText)
      // Return empty data or throw an error based on desired behavior
      return {
        stats: {},
        rfqs: [],
        quotes: [],
        orders: [],
      }
    }

    const data = await response.json()
    return data

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    // Return empty data on network or other unexpected errors
    return {
      stats: {},
      rfqs: [],
      quotes: [],
      orders: [],
    }
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  // If user is a partner, redirect to partner portal
  if (user.type === "partner") {
    redirect("/channel-partner")
  }

  const { stats, rfqs, quotes, orders } = await getDashboardData()

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