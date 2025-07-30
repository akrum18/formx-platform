import { NextResponse } from "next/server"

export async function POST() {
  // For JWT-based auth, logout is handled client-side by removing the token
  // This endpoint exists for consistency and potential future server-side token blacklisting
  
  return NextResponse.json({
    success: true,
    message: "Logged out successfully"
  })
}