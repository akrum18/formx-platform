import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthProvider } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import QueryProvider from "@/providers/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Manufacturing Admin Panel",
  description: "Internal admin panel for managing pricing structures",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
                <SidebarProvider defaultOpen={true}>
                  <AdminSidebar />
                  <SidebarInset>
                    <main className="flex-1 overflow-auto">{children}</main>
                  </SidebarInset>
                </SidebarProvider>
              </div>
            </ProtectedRoute>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
