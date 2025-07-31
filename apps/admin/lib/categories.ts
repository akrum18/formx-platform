/**
 * Centralized Category Management
 * Provides consistent category handling across the admin module
 */

// Standard manufacturing categories
export const STANDARD_CATEGORIES = [
  'Sheet Metal',
  'Machining', 
  'Assembly',
  '3D Printing',
  'Casting',
  'Welding',
  'Finishing'
] as const;

export type StandardCategory = typeof STANDARD_CATEGORIES[number];

/**
 * Get unique categories from routing data
 */
export function getCategoriesFromRoutings(routings: Array<{ category: string }>): string[] {
  return [...new Set(routings.map(r => r.category))].sort();
}

/**
 * Get unique categories from pricing configuration data
 */
export function getCategoriesFromPricing(pricingRoutings: Array<{ category: string }>): string[] {
  return [...new Set(pricingRoutings.map(r => r.category))].sort();
}

/**
 * Validate if a category is a standard one
 */
export function isStandardCategory(category: string): category is StandardCategory {
  return STANDARD_CATEGORIES.includes(category as StandardCategory);
}

/**
 * Get category display information
 */
export function getCategoryInfo(category: string) {
  const isStandard = isStandardCategory(category);
  
  return {
    name: category,
    isStandard,
    description: isStandard ? getStandardCategoryDescription(category) : 'Custom category',
    color: isStandard ? getStandardCategoryColor(category) : 'gray'
  };
}

/**
 * Get description for standard categories
 */
function getStandardCategoryDescription(category: StandardCategory): string {
  const descriptions: Record<StandardCategory, string> = {
    'Sheet Metal': 'Laser cutting, bending, forming, and welding operations',
    'Machining': 'CNC milling, turning, drilling, and precision machining',
    'Assembly': 'Component assembly and integration workflows',
    '3D Printing': 'Additive manufacturing processes',
    'Casting': 'Metal casting and molding operations',
    'Welding': 'Welding and joining processes',
    'Finishing': 'Surface treatment and finishing operations'
  };
  
  return descriptions[category];
}

/**
 * Get color scheme for standard categories
 */
function getStandardCategoryColor(category: StandardCategory): string {
  const colors: Record<StandardCategory, string> = {
    'Sheet Metal': 'blue',
    'Machining': 'green',
    'Assembly': 'purple',
    '3D Printing': 'orange',
    'Casting': 'red',
    'Welding': 'yellow',
    'Finishing': 'pink'
  };
  
  return colors[category];
}

/**
 * Suggest category based on routing name or processes
 */
export function suggestCategory(routingName: string, processes: string[] = []): StandardCategory {
  const name = routingName.toLowerCase();
  const processNames = processes.map(p => p.toLowerCase());
  
  // Check routing name patterns
  if (name.includes('laser') || name.includes('sheet') || name.includes('bend')) {
    return 'Sheet Metal';
  }
  
  if (name.includes('cnc') || name.includes('mill') || name.includes('turn') || name.includes('machine')) {
    return 'Machining';
  }
  
  if (name.includes('3d') || name.includes('print') || name.includes('fdm') || name.includes('sla')) {
    return '3D Printing';
  }
  
  if (name.includes('weld') || name.includes('tig') || name.includes('mig')) {
    return 'Welding';
  }
  
  if (name.includes('assembly') || name.includes('assemble')) {
    return 'Assembly';
  }
  
  if (name.includes('cast') || name.includes('mold')) {
    return 'Casting';
  }
  
  if (name.includes('finish') || name.includes('coat') || name.includes('anodiz') || name.includes('paint')) {
    return 'Finishing';
  }
  
  // Check process names
  if (processNames.some(p => p.includes('laser') || p.includes('bend') || p.includes('brake'))) {
    return 'Sheet Metal';
  }
  
  if (processNames.some(p => p.includes('cnc') || p.includes('mill') || p.includes('turn'))) {
    return 'Machining';
  }
  
  if (processNames.some(p => p.includes('weld'))) {
    return 'Welding';
  }
  
  if (processNames.some(p => p.includes('3d') || p.includes('print'))) {
    return '3D Printing';
  }
  
  // Default fallback
  return 'Sheet Metal';
}