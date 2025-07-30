"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface User {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for existing auth token on mount and validate it
    const checkAuthStatus = async () => {
      const token = localStorage.getItem("auth_token")
      
      if (token) {
        try {
          const response = await fetch("/api/v2/auth/me", {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem("auth_token")
            localStorage.removeItem("user_data")
          }
        } catch (error) {
          console.error("Auth check failed:", error)
          localStorage.removeItem("auth_token")
          localStorage.removeItem("user_data")
        }
      }

      setIsLoading(false)
    }

    checkAuthStatus()
  }, [])

  useEffect(() => {
    // Redirect to login if not authenticated and not already on login page
    if (!isLoading && !user && pathname !== "/login" && pathname !== "/forgot-password") {
      router.push("/login")
    }
    // Redirect to dashboard if authenticated and on login page
    if (!isLoading && user && pathname === "/login") {
      router.push("/")
    }
  }, [user, isLoading, pathname, router])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/v2/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Store token and user data
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("user_data", JSON.stringify(data.user))
        setUser(data.user)
        return true
      } else {
        const errorData = await response.json()
        console.error("Login failed:", errorData.error)
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (token) {
        await fetch("/api/v2/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user_data")
      setUser(null)
      router.push("/login")
    }
  }

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || user?.role === "admin" || false
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
