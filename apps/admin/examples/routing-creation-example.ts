// Example: How to use Solution 3 for creating routings with proper validation

import { createRouting } from "@/lib/api-routings"
import { validateRoutingData } from "@/types/routing"
import type { Routing } from "@/types/routing"

// Example 1: Basic routing creation with validation
async function createBasicRouting() {
  // Your partial routing data (this is what was causing the TypeScript error)
  const routingData: Partial<Routing> = {
    name: "Laser Cut + Bend",
    description: "Basic sheet metal routing with laser cutting and bending",
    category: "Sheet Metal",
    steps: [
      // ... your routing steps
    ],
    estimatedLeadTime: 5,
    active: true,
    materialMarkup: 35,
    finishingCost: 0.5,
    defaultMaterialCost: 100,
    defaultSurfaceArea: 100,
    defaultRuntimeMinutes: 30,
  }

  try {
    // Solution 3: Use the validation helper function
    const validatedRoutingData = validateRoutingData(routingData)
    const created = await createRouting(validatedRoutingData)
    
    console.log("Routing created successfully:", created)
    return created
  } catch (error) {
    console.error("Failed to create routing:", error)
    throw error
  }
}

// Example 2: One-liner approach
async function createRoutingOneLiner(routingData: Partial<Routing>) {
  try {
    // This is the cleanest approach - validation and creation in one line
    const created = await createRouting(validateRoutingData(routingData))
    return created
  } catch (error) {
    console.error("Failed to create routing:", error)
    throw error
  }
}

// Example 3: Handling validation errors gracefully
async function createRoutingWithErrorHandling(routingData: Partial<Routing>) {
  try {
    // The validateRoutingData function will throw descriptive errors for missing required fields
    const validatedData = validateRoutingData(routingData)
    const created = await createRouting(validatedData)
    
    return {
      success: true,
      data: created,
      error: null
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors (missing name, description, category)
      if (error.message.includes("required")) {
        return {
          success: false,
          data: null,
          error: `Validation Error: ${error.message}`
        }
      }
      
      // Handle API errors
      return {
        success: false,
        data: null,
        error: `API Error: ${error.message}`
      }
    }
    
    return {
      success: false,
      data: null,
      error: "Unknown error occurred"
    }
  }
}

// Example of what the validateRoutingData function does internally:
/*
export function validateRoutingData(data: Partial<Routing>): CreateRoutingData {
  // Validates required fields
  if (!data.name) {
    throw new Error("Routing name is required")
  }
  if (!data.description) {
    throw new Error("Routing description is required")
  }
  if (!data.category) {
    throw new Error("Routing category is required")
  }

  // Returns complete routing data with defaults for optional fields
  return {
    name: data.name,
    description: data.description,
    category: data.category,
    steps: data.steps || [],
    totalSetupTime: data.totalSetupTime || 0,
    estimatedLeadTime: data.estimatedLeadTime || 0,
    active: data.active ?? true,
    materialMarkup: data.materialMarkup || 0,
    finishingCost: data.finishingCost || 0,
    isPrimaryPricingRoute: data.isPrimaryPricingRoute || false,
    defaultMaterialCost: data.defaultMaterialCost || 0,
    defaultSurfaceArea: data.defaultSurfaceArea || 0,
    defaultRuntimeMinutes: data.defaultRuntimeMinutes || 0,
  }
}
*/

export {
  createBasicRouting,
  createRoutingOneLiner,
  createRoutingWithErrorHandling
}