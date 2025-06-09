"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Eye, EyeOff, AlertCircle, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Assuming your backend API base URL is configured in a .env file
// For development, it's typically http://localhost:8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded", // FastAPI expects this for OAuth2PasswordRequestForm
        },
        body: new URLSearchParams({
          username: formData.email,
          password: formData.password,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail || "Login failed");
        return; // Stop execution if login failed
      }

      const data = await response.json();
      const accessToken = data.access_token;

      // Store auth token in localStorage for client-side access
      localStorage.setItem("auth_token", accessToken);

      // Fetch user data including role and permissions after successful login
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!userResponse.ok) {
        console.error("Failed to fetch user data after login");
        // Even if user data fetch fails, we might proceed if token is valid
        // Or redirect to login if crucial data is missing. For now, log and proceed.
        localStorage.removeItem("auth_token"); // Clear token if user data can't be fetched
        setError("Login successful, but failed to retrieve user data. Please try again.");
        return;
      }

      const userData = await userResponse.json();

      // Assuming backend /api/auth/me returns role and permissions
      // Adjust the structure based on your actual backend response
      localStorage.setItem(
        "user_data",
        JSON.stringify({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role, // Assuming role is returned
          permissions: userData.permissions || ["materials", "processes", "routings", "finishes", "margins", "features", "versions"], // Default or actual permissions
        }),
      );

      // Redirect to the admin dashboard
      router.push("/");

    } catch (err) {
      console.error("An error occurred during login:", err);
      setError("An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fefefe] to-[#e8dcaa]/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#fefefe] shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#e8dcaa] to-[#fefefe] text-center pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#d4c273] to-[#d4c273] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="h-8 w-8 text-[#fefefe]" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#525253]">Manufacturing Admin</CardTitle>
          <CardDescription className="text-[#908d8d] mt-2">Sign in to access the admin panel</CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#525253]">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@manufacturing.com"
                required
                className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273] h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#525253]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273] h-12 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-[#908d8d]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[#908d8d]" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="rounded border-[#908d8d] text-[#d4c273] focus:ring-[#d4c273]"
                />
                <Label htmlFor="remember" className="text-sm text-[#525253]">
                  Remember me
                </Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-[#d4c273] hover:text-[#d4c273]/80 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe] font-medium shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#fefefe]/30 border-t-[#fefefe] rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Sign In
                </div>
              )}
            </Button>
          </form>

          {/* Demo Credentials - Keep for reference during testing */}
          <div className="mt-6 p-4 bg-[#e8dcaa]/20 rounded-xl border border-[#e8dcaa]">
            <p className="text-sm font-medium text-[#525253] mb-2">Demo Credentials:</p>
            <div className="text-sm text-[#908d8d] space-y-1">
              <p>
                <strong>Email:</strong> admin@formx.com
              </p>
              <p>
                <strong>Password:</strong> password123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}