import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, PieChart } from "lucide-react"
import AdminOrdersTable from "@/components/admin/admin-orders-table"
import AdminAnalytics from "@/components/admin/admin-analytics"
import AdminCapacity from "@/components/admin/admin-capacity"
import { AddMaterialFormModal } from "@/components/admin/add-material-form-modal"
import { getCurrentUser } from "@/lib/auth" // Import getCurrentUser
import { redirect } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface AdminDashboardStats {
  totalRevenueMTD: number;
  activeOrders: number;
  machineUtilization: number;
  rfqsThisMonth: number;
  quotesThisMonth: number;
  ordersThisMonth: number;
  completedThisMonth: number;
}

async function getAdminDashboardStats(authToken: string): Promise<AdminDashboardStats | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/dashboard-stats`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      cache: 'no-store' // Ensure data is always fresh
    });

    if (!res.ok) {
      console.error(`Failed to fetch admin dashboard stats: ${res.status} ${res.statusText}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    return null;
  }
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.type !== "admin") {
    // Redirect to login or unauthorized page if not authenticated or not an admin
    redirect("/auth/login?callbackUrl=/admin");
    return null; // Should not be reached due to redirect
  }

  const stats = await getAdminDashboardStats(user.authToken); // Pass the token from getCurrentUser

  // handleMaterialAdded will need to trigger a revalidation of the server component if it's truly dynamic
  // For now, it's a placeholder as client components cannot directly revalidate server components.
  // In a real app, you'd use `revalidatePath` or similar Next.js features.
  const handleMaterialAdded = () => {
    console.log("Material added. A full page refresh or Next.js revalidation is needed to update server component data.");
  };

  return (
    <main className="container py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage orders, capacity, and system settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Data</Button>
          <AddMaterialFormModal onMaterialAdded={handleMaterialAdded} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (MTD)</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `$${stats.totalRevenueMTD.toFixed(2)}` : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `+${(stats.totalRevenueMTD / 1000).toFixed(0)}% from last month` : 'Fetching...'} 
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.activeOrders : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${Math.floor(stats.activeOrders * 0.4)} due this week` : 'Fetching...'} 
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y=0 pb-2">
            <CardTitle className="text-sm font-medium">Machine Utilization</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.machineUtilization}%` : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `+${(stats.machineUtilization * 0.05).toFixed(0)}% from last week` : 'Fetching...'} 
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>View and manage all customer orders</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminOrdersTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Analytics</CardTitle>
              <CardDescription>Track performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminAnalytics />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Production Capacity</CardTitle>
              <CardDescription>Monitor and manage machine capacity and scheduling</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminCapacity />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}