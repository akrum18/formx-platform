"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function RoutingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
          <p className="text-slate-600 mb-6">
            {error.message || "An error occurred while loading the routings. Please try again."}
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="bg-white hover:bg-slate-50"
            >
              Go Home
            </Button>
            <Button
              onClick={() => reset()}
              className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}