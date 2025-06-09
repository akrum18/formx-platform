"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded", // FastAPI expects this for OAuth2PasswordRequestForm
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }).toString(),
    })

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.detail || "Login failed",
      }
    }

    const data = await response.json()
    const accessToken = data.access_token

    const cookieStore = await cookies()
    cookieStore.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    // Assuming a successful login is for a 'user' type by default for this endpoint
    cookieStore.set("user_type", "user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    let redirectTo = "/dashboard"
    if (callbackUrl && callbackUrl.trim() !== "") {
      redirectTo = callbackUrl
    }
    redirect(redirectTo)

  } catch (error) {
    console.error("Error during login:", error)
    return {
      success: false,
      message: "An unexpected error occurred during login.",
    }
  }
}

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const company = formData.get("company") as string
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, company, password }),
    })

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.detail || "Registration failed",
      }
    }

    const data = await response.json()
    // Assuming registration directly logs in and returns an access token
    // If not, you'd need to call loginUser here or redirect to login page
    const accessToken = data.access_token // Assuming backend returns access_token on successful registration

    const cookieStore = await cookies()
    cookieStore.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })
    cookieStore.set("user_type", "user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    let redirectTo = "/dashboard"
    if (callbackUrl && callbackUrl.trim() !== "") {
      redirectTo = callbackUrl
    }
    redirect(redirectTo)

  } catch (error) {
    console.error("Error during registration:", error)
    return {
      success: false,
      message: "An unexpected error occurred during registration.",
    }
  }
}

export async function loginPartner(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const partnerCode = formData.get("partnerCode") as string

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/partner/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, partner_code: partnerCode }), // Ensure partner_code matches backend expected field
    })

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.detail || "Partner login failed",
      }
    }

    const data = await response.json()
    const accessToken = data.access_token

    const cookieStore = await cookies()
    cookieStore.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })
    cookieStore.set("user_type", "partner", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    redirect("/channel-partner") // Partners always go to partner portal

  } catch (error) {
    console.error("Error during partner login:", error)
    return {
      success: false,
      message: "An unexpected error occurred during partner login.",
    }
  }
}

export async function logoutUser() {
  const cookieStore = await cookies()

  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })

  cookieStore.set("user_type", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })

  // Redirect to login page after logout
  redirect("/auth/login")
}

// This getCurrentUser is likely not needed here anymore as lib/auth.ts handles it
// However, if other parts of auth-actions rely on it for server-side logic,
// it should call the getCurrentUser from lib/auth.ts
// For now, I'll remove the mock implementation here.
export async function getCurrentUser() {
  return null; // This function should defer to lib/auth.ts or be removed if not used.
}