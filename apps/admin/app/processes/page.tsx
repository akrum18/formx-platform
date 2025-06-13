"use client"

import { DialogFooter } from "@/components/ui/dialog"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVExportDialog } from "@/components/csv-export-dialog"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Settings, Upload, Download, Wrench, Search, Filter, Trash2 } from "lucide-react"
import { SortableTableHeader } from "@/components/sortable-table-header"
import { TableControls } from "@/components/table-controls"
import { GroupedTableSection } from "@/components/grouped-table-section"
import { sortData, groupData, type SortConfig, getTableColumnClasses } from "@/lib/table-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CategoryManager } from "@/components/category-manager"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { toast } from "sonner"

interface Process {
  id: string
  name: string
  setup_time: number
  hourly_rate: number
  minimum_cost: number
  complexity_multiplier: number
  active: boolean
  category_id: string | null
  description: string | null
  equipment_required: string[] | null
  skill_level: string | null
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  name: string
  type: string
}

const API_BASE_URL =  "http://localhost:8000"

const groupOptions = [
  { value: "active", label: "Status" },
  { value: "category_id", label: "Category" }, // Group by category_id, will need to map to name for display
]

const processFieldMappings = {
  name: { label: "Process Name", required: true, type: "string" },
  category_id: { label: "Category ID", required: true, type: "string" }, // For CSV, will be UUID
  setup_time: { label: "Setup Time (min)", required: true, type: "number" },
  hourly_rate: { label: "Hourly Rate ($)", required: true, type: "number" },
  minimum_cost: { label: "Minimum Cost ($)", required: true, type: "number" },
  complexity_multiplier: { label: "Complexity Multiplier", required: true, type: "number" },
  active: { label: "Active", required: false, type: "boolean" },
  description: { label: "Description", required: false, type: "string" },
  equipment_required: { label: "Equipment Required (semicolon-separated)", required: false, type: "string" },
  skill_level: { label: "Skill Level", required: false, type: "string" },
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]) // Reverted to empty array
  const [categories, setCategories] = useState<Category[]>([]) // Reverted to empty array
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchProcesses = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/processes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Process[] = await response.json()
      setProcesses(data)
    } catch (error) {
      console.error("Failed to fetch processes:", error)
      toast.error("Failed to load processes.")
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Category[] = await response.json()
      setCategories(data.filter(cat => cat.type === 'process')) // Filter for process categories
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      toast.error("Failed to load categories.")
    }
  }, [])

  useEffect(() => {
    fetchProcesses()
    fetchCategories()
  }, [fetchProcesses, fetchCategories])

  const getCategoryName = (categoryId: string | null) => {
    return categories.find(cat => cat.id === categoryId)?.name || "Uncategorized"
  }

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleEdit = (process: Process) => {
    setEditingProcess(process)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingProcess(null)
    setIsDialogOpen(true)
  }

  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value
    const setup_time = parseInt((form.elements.namedItem("setup_time") as HTMLInputElement)?.value)
    const hourly_rate = parseFloat((form.elements.namedItem("hourly_rate") as HTMLInputElement)?.value)
    const minimum_cost = parseFloat((form.elements.namedItem("minimum_cost") as HTMLInputElement)?.value)
    const complexity_multiplier = parseFloat((form.elements.namedItem("complexity_multiplier") as HTMLInputElement)?.value)
    const category_id = (form.elements.namedItem("category_id") as HTMLSelectElement)?.value || null
    const active = (form.elements.namedItem("active") as HTMLInputElement)?.checked ?? true

    const processData = {
      name,
      setup_time,
      hourly_rate,
      minimum_cost,
      complexity_multiplier,
      active,
      category_id,
    }

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      let response
      if (editingProcess) {
        response = await fetch(`${API_BASE_URL}/api/admin/processes/${editingProcess.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(processData),
        })
      } else {
        response = await fetch(`${API_BASE_URL}/api/admin/processes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(processData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data: Process = await response.json()
      if (editingProcess) {
        setProcesses((prev) => prev.map((p) => (p.id === data.id ? data : p)))
        toast.success("Process updated successfully!")
      } else {
        setProcesses((prev) => [...prev, data])
        toast.success("Process added successfully!")
      }
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to save process:", error)
      toast.error(`Failed to save process: ${error.message || "An unexpected error occurred"}`)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProcess = async (id: string) => {
    const processToToggle = processes.find((p) => p.id === id)
    if (!processToToggle) return

    setIsSaving(true)
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      const updatedProcess = { ...processToToggle, active: !processToToggle.active }
      const response = await fetch(`${API_BASE_URL}/api/admin/processes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: updatedProcess.name,
          setup_time: updatedProcess.setup_time,
          hourly_rate: updatedProcess.hourly_rate,
          minimum_cost: updatedProcess.minimum_cost,
          complexity_multiplier: updatedProcess.complexity_multiplier,
          active: updatedProcess.active,
          category_id: updatedProcess.category_id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: Process = await response.json()
      setProcesses((prev) => prev.map((p) => (p.id === id ? data : p)))
      toast.success("Process status updated successfully!")
    } catch (error) {
      console.error("Failed to toggle process status:", error)
      toast.error("Failed to update process status.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this process?")) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/processes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setProcesses((prev) => prev.filter((p) => p.id !== id))
      toast.success("Process deleted successfully!")
    } catch (error) {
      console.error("Failed to delete process:", error)
      toast.error("Failed to delete process.")
    } finally {
      setIsDeleting(false)
    }
  }

 const handleCategoriesUpdate = async (newCategoryNames: string[]) => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      toast.error("Authentication token not found. Please log in.")
      return
    }

    const existingCategoryNames = categories.map(cat => cat.name);

    // Categories to add
    const categoriesToAdd = newCategoryNames.filter(name => !existingCategoryNames.includes(name));

    // Categories to remove
    const categoriesToRemove = existingCategoryNames.filter(name => !newCategoryNames.includes(name));

    // Collect promises for API calls
    const addPromises = categoriesToAdd.map(name =>
      fetch(`${API_BASE_URL}/api/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type: 'process' }),
      })
        .then(async response => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to add category ${name}: HTTP error! status: ${response.status}`);
          }
          toast.success(`Category '${name}' added successfully.`);
        })
        .catch((error) => {
          console.error(`Failed to add category '${name}':`, error);
          toast.error(`Failed to add category '${name}': ${error.message || "An unexpected error occurred"}`);
        })
    );

    const removePromises = categoriesToRemove.map(name => {
      const categoryToDelete = categories.find(cat => cat.name === name && cat.type === 'process');
      if (!categoryToDelete) return Promise.resolve();
      return fetch(`${API_BASE_URL}/api/admin/categories/${categoryToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async response => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to delete category ${name}: HTTP error! status: ${response.status}`);
          }
          toast.success(`Category '${name}' deleted successfully.`);
        })
        .catch((error) => {
          console.error(`Failed to delete category '${name}':`, error);
          toast.error(`Failed to delete category '${name}': ${error.message || "An unexpected error occurred"}`);
        });
    });

    // Await all API calls
    await Promise.all([...addPromises, ...removePromises]);
    // Re-fetch categories after all updates
    await fetchCategories();
  }

  const filteredProcesses = processes.filter(
    (process) =>
      process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryName(process.category_id).toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedProcesses = sortData(filteredProcesses, sortConfig)

  const groupedProcesses = groupData(sortedProcesses, groupBy === 'category_id' ? 'category_id' : groupBy)

  const renderProcessRow = (process: Process) => (
    <TableRow key={process.id} className="hover:bg-[#e8dcaa]/20 transition-colors">
      <TableCell className="font-medium text-slate-900">{process.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {getCategoryName(process.category_id)}
        </Badge>
      </TableCell>
      <TableCell>{process.setup_time} min</TableCell>
      <TableCell className="font-mono">${process.hourly_rate}/hr</TableCell>
      <TableCell className="font-mono">${process.minimum_cost}</TableCell>
      <TableCell className="font-medium">{process.complexity_multiplier}x</TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Switch checked={process.active} onCheckedChange={() => toggleProcess(process.id)} />
          <Badge
            variant={process.active ? "default" : "secondary"}
            className={
              process.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600"
            }
          >
            {process.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(process)}
            className="hover:bg-[#d4c273]/20 hover:text-[#525253]"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(process.id)}
            className="hover:bg-red-50 hover:text-red-600"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  const renderTable = (processesToRender: Process[], showHeader = true, isGrouped = false) => {
    const columnClasses = getTableColumnClasses().processes

    return (
      <Table>
        <TableHeader className={isGrouped ? "border-b-0" : ""}>
          <TableRow className="hover:bg-transparent border-slate-200">
            <SortableTableHeader
              sortKey="name"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.name}
            >
              Process
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="category_id"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.category}
            >
              Category
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="setup_time"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.setupTime}
            >
              Setup Time
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="hourly_rate"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.hourlyRate}
            >
              Hourly Rate
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="minimum_cost"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.minimumCost}
            >
              Minimum Cost
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="complexity_multiplier"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.complexity}
            >
              Complexity
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="active"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.status}
            >
              Status
            </SortableTableHeader>
            <TableHead className={columnClasses.actions}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{processesToRender.map(renderProcessRow)}</TableBody>
      </Table>
    )
  }

  const handleImport = async (importedData: any[]) => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      toast.error("Authentication token not found. Please log in.")
      return
    }

    for (const item of importedData) {
      try {
        // Find category ID by name, or default to first available category if not found
        const category = categories.find(cat => cat.name.toLowerCase() === (item.category || '').toLowerCase());
        const category_id = category ? category.id : (categories.length > 0 ? categories[0].id : null);

        const processData = {
          name: item.name || "",
          setup_time: Number(item.setupTime) || 0,
          hourly_rate: Number(item.hourlyRate) || 0,
          minimum_cost: Number(item.minimumCost) || 0,
          complexity_multiplier: Number(item.complexityMultiplier) || 1.0,
          active: item.active !== undefined ? item.active : true,
          category_id: category_id, // Use category_id
          description: item.description || null,
         equipment_required: typeof item.equipment_required === "string"
  ? item.equipment_required
      .split(';')
      .map((s: string) => s.trim())
      .filter(Boolean)
  : null,
          skill_level: item.skill_level || null,
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/processes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(processData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || `Failed to import process ${item.name}: HTTP error! status: ${response.status}`)
        }
        toast.success(`Process '${item.name}' imported successfully.`)
      } catch (error: any) {
        console.error(`Failed to import process '${item.name}':`, error)
        toast.error(`Failed to import process '${item.name}': ${error.message || "An unexpected error occurred"}`)
      }
    }
    fetchProcesses() // Re-fetch all processes after import
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl p-2 shadow-sm" />
            <div className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">Manufacturing Processes</h1>
                <p className="text-lg text-slate-600">
                  Configure setup times, hourly rates, and complexity multipliers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="h-10 px-4 border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="h-10 px-4 border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="h-10 px-4 border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Categories
                </Button>
                <Button
                  onClick={handleAdd}
                  className="h-10 px-4 bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe] shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Process
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Processes</p>
                  <p className="text-xl font-bold text-slate-900">{processes.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Processes</p>
                  <p className="text-xl font-bold text-slate-900">{processes.filter((p) => p.active).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Categories</p>
                  <p className="text-xl font-bold text-slate-900">{categories.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Rate</p>
                  <p className="text-xl font-bold text-slate-900">
                    {processes.length > 0 ? Math.round(processes.reduce((sum, p) => sum + p.hourly_rate, 0) / processes.length) : 0}/hr
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Process Library</CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Manage process parameters and pricing configurations
                </CardDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
              </div>
              <Button variant="outline" size="sm" className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <TableControls
              groupOptions={groupOptions}
              currentGroup={groupBy}
              onGroupChange={setGroupBy}
              onClearGroup={() => setGroupBy("")}
            />

            {groupBy ? (
              <div>
                {Object.entries(groupedProcesses).map(([groupValue, groupProcesses]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={groupBy}
                    groupValue={groupBy === 'category_id' ? getCategoryName(groupValue) : groupValue}
                    itemCount={groupProcesses.length}
                  >
                    {renderTable(groupProcesses, true, true)}
                  </GroupedTableSection>
                ))}
              </div>
            ) : (
              renderTable(sortedProcesses, true, false)
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {editingProcess ? `Edit Process: ${editingProcess.name}` : "Add Process"}
              </DialogTitle>
              <DialogDescription className="text-slate-600">Configure process parameters and pricing</DialogDescription>
            </DialogHeader>
            <form id="process-form" onSubmit={handleSaveProcess}>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                    Process Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProcess?.name}
                    required
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category_id" className="text-sm font-medium text-slate-700">
                    Category
                  </Label>
                  <Select name="category_id" defaultValue={editingProcess?.category_id || (categories.length > 0 ? categories[0].id : '')}>
                    <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="setup_time" className="text-sm font-medium text-slate-700">
                      Setup Time (min)
                    </Label>
                    <Input
                      id="setup_time"
                      name="setup_time"
                      type="number"
                      defaultValue={editingProcess?.setup_time}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hourly_rate" className="text-sm font-medium text-slate-700">
                      Hourly Rate ($)
                    </Label>
                    <Input
                      id="hourly_rate"
                      name="hourly_rate"
                      type="number"
                      defaultValue={editingProcess?.hourly_rate}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minimum_cost" className="text-sm font-medium text-slate-700">
                      Minimum Cost ($)
                    </Label>
                    <Input
                      id="minimum_cost"
                      name="minimum_cost"
                      type="number"
                      defaultValue={editingProcess?.minimum_cost}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="complexity_multiplier" className="text-sm font-medium text-slate-700">
                      Complexity Multiplier
                    </Label>
                    <Input
                      id="complexity_multiplier"
                      name="complexity_multiplier"
                      type="number"
                      step="0.1"
                      defaultValue={editingProcess?.complexity_multiplier}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="active" name="active" defaultChecked={editingProcess?.active ?? true} />
                  <Label htmlFor="active" className="text-sm text-slate-700">
                    Active
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]" disabled={isSaving}>
                  {isSaving ? "Saving..." : (editingProcess ? "Save Changes" : "Add Process")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <CSVImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImport}
          entityType="processes"
          fieldMappings={processFieldMappings}
        />

        <CSVExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          data={processes}
          entityType="processes"
          fieldMappings={processFieldMappings}
        />

        <CategoryManager
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
          categories={categories.map(cat => cat.name)}
          onCategoriesUpdate={handleCategoriesUpdate}
          title="Process Categories"
          description="Manage process categories for organizing manufacturing processes"
        />
      </div>
    </div>
  )
}