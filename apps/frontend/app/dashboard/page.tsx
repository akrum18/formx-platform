import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import DashboardClient from "./dashboard-client"

export const metadata: Metadata = {
  title: "Dashboard | Form(X)",
  description: "Manufacturing quote and order management dashboard",
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

  return <DashboardClient user={user} />
}