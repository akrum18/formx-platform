export type SortDirection = "asc" | "desc" | undefined

export interface SortConfig {
  key: string
  direction: SortDirection
}

export interface GroupConfig {
  key: string
  label: string
}

export function sortData<T>(data: T[], sortConfig: SortConfig): T[] {
  if (!sortConfig.key || !sortConfig.direction) return data

  return [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key)
    const bValue = getNestedValue(b, sortConfig.key)

    if (aValue === bValue) return 0

    const comparison = aValue < bValue ? -1 : 1
    return sortConfig.direction === "asc" ? comparison : -comparison
  })
}

export function groupData<T>(data: T[], groupKey: string): Record<string, T[]> {
  if (!groupKey) return { "All Items": data }

  return data.reduce(
    (groups, item) => {
      const groupValue = getNestedValue(item, groupKey) || "Ungrouped"
      const groupName = String(groupValue)

      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(item)
      return groups
    },
    {} as Record<string, T[]>,
  )
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj)
}

export function getGroupDisplayName(key: string, value: string): string {
  switch (key) {
    case "active":
      return value === "true" ? "Active" : "Inactive"
    case "type":
      return `${value} Finishes`
    case "status":
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Versions`
    default:
      return value
  }
}

export function getTableColumnClasses() {
  return {
    // Materials table
    materials: {
      name: "w-[200px]",
      cost: "w-[120px]",
      markup: "w-[100px]",
      density: "w-[120px]",
      processes: "w-[250px]",
      status: "w-[140px]",
      actions: "w-[100px]",
    },
    // Processes table
    processes: {
      name: "w-[180px]",
      category: "w-[140px]",
      setupTime: "w-[120px]",
      hourlyRate: "w-[120px]",
      minimumCost: "w-[130px]",
      complexity: "w-[160px]",
      status: "w-[140px]",
      actions: "w-[100px]",
    },
    // Finishes table
    finishes: {
      name: "w-[180px]",
      type: "w-[120px]",
      cost: "w-[120px]",
      leadTime: "w-[120px]",
      description: "w-[200px]",
      status: "w-[140px]",
      actions: "w-[100px]",
    },
    // Versions table
    versions: {
      version: "w-[140px]",
      status: "w-[120px]",
      createdBy: "w-[150px]",
      created: "w-[140px]",
      published: "w-[140px]",
      description: "w-[250px]",
      actions: "w-[100px]",
    },
  }
}
