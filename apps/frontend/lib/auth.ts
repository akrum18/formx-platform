import { cookies } from "next/headers"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth_token")
  const userType = cookieStore.get("user_type")

  console.log("getCurrentUser - Auth token:", authToken?.value)
  console.log("getCurrentUser - User type:", userType?.value)

  if (!authToken?.value || !userType?.value) {
    console.log("getCurrentUser - No auth token or user type")
    return null
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken.value}`,
      },
      // Cache: 'no-store' is important for dynamic data in Next.js Server Components
      cache: 'no-store',
    })

    if (!response.ok) {
      // If token is invalid or expired, return null.
      // Cookies must be cleared in a Server Action or Route Handler.
      console.error("Failed to fetch current user from backend:", response.status, await response.text());
      return null;
    }

    const user = await response.json()

    console.log("getCurrentUser - Found user from backend:", user.email)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company,
      type: userType.value as "user" | "partner", // Ensure type is correct
      // Add other fields relevant to user or partner if needed
      ...(userType.value === "partner" && { partnerCode: user.partner_code }),
    }
  } catch (error) {
    console.error("Error fetching current user from backend:", error)
    return null
  }
}