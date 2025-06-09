"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Package, Search, Filter, Upload, Download } from "lucide-react"
import { SortableTableHeader } from "@/components/sortable-table-header"
import { TableControls } from "@/components/table-controls"
import { GroupedTableSection } from "@/components/grouped-table-section"
import { sortData, groupData, type SortConfig } from "@/lib/table-utils"
import { Switch } from "@/components/ui/switch"
import { getTableColumnClasses } from "@/lib/table-utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVExportDialog } from "@/components/csv-export-dialog"
import { toast } from "sonner"

interface Material {
  id: string
  name: string
  cost: number
  markup: number
  density: number
  unit: string
  active: boolean
  category_id: string | null
  supplier: string | null
  material_grade: string | null
  specifications: Record<string, any> | null // Processes will be stored here
  created_at: string
  updated_at: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

const groupOptions = [
  { value: "active", label: "Status" },
  { value: "unit", label: "Unit" },
  { value: "specifications.processes.0", label: "Primary Process" }, // Assuming processes are in specifications
]

const materialFieldMappings = {
  name: { label: "Material Name", required: true, type: "string" },
  cost: { label: "Cost per lb", required: true, type: "number" },
  markup: { label: "Markup %", required: true, type: "number" },
  density: { label: "Density (g/cm³)", required: true, type: "number" },
  unit: { label: "Unit", required: false, type: "string" },
  active: { label: "Active", required: false, type: "boolean" },
  processes: { label: "Compatible Processes", required: false, type: "string" }, // For CSV import/export
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchMaterials = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/materials`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Material[] = await response.json()
      setMaterials(data)
    } catch (error) {
      console.error("Failed to fetch materials:", error)
      toast.error("Failed to load materials.")
    }
  }, [])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const toggleMaterial = async (id: string) => {
    const materialToToggle = materials.find((m) => m.id === id)
    if (!materialToToggle) return

    setIsSaving(true)
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      const updatedMaterial = { ...materialToToggle, active: !materialToToggle.active }
      const response = await fetch(`${API_BASE_URL}/api/admin/materials/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: updatedMaterial.name,
          cost: updatedMaterial.cost,
          markup: updatedMaterial.markup,
          density: updatedMaterial.density,
          unit: updatedMaterial.unit,
          active: updatedMaterial.active,
          category_id: updatedMaterial.category_id,
          supplier: updatedMaterial.supplier,
          material_grade: updatedMaterial.material_grade,
          specifications: updatedMaterial.specifications,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: Material = await response.json()
      setMaterials((prev) => prev.map((m) => (m.id === id ? data : m)))
      toast.success("Material status updated successfully!")
    } catch (error) {
      console.error("Failed to toggle material status:", error)
      toast.error("Failed to update material status.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingMaterial(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/materials/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setMaterials((prev) => prev.filter((m) => m.id !== id))
      toast.success("Material deleted successfully!")
    } catch (error) {
      console.error("Failed to delete material:", error)
      toast.error("Failed to delete material.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value
    const cost = parseFloat((form.elements.namedItem("cost") as HTMLInputElement)?.value)
    const markup = parseFloat((form.elements.namedItem("markup") as HTMLInputElement)?.value)
    const density = parseFloat((form.elements.namedItem("density") as HTMLInputElement)?.value)
    const unit = "lb" // Hardcoded as per mock, adjust if UI allows selection
    const active = (form.elements.namedItem("active") as HTMLInputElement)?.checked ?? true // Default to true if not found

    const processesCheckboxes = Array.from(form.elements).filter(
      (el) => (el as HTMLInputElement).type === "checkbox" && (el as HTMLInputElement).id.startsWith("process-"),
    ) as HTMLInputElement[]
    const compatibleProcesses = processesCheckboxes.filter((cb) => cb.checked).map((cb) => cb.value)

    const materialData = {
      name,
      cost,
      markup,
      density,
      unit,
      active,
      specifications: { processes: compatibleProcesses }, // Store processes in specifications
    }

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      let response
      if (editingMaterial) {
        // Update existing material
        response = await fetch(`${API_BASE_URL}/api/admin/materials/${editingMaterial.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(materialData),
        })
      } else {
        // Create new material
        response = await fetch(`${API_BASE_URL}/api/admin/materials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(materialData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data: Material = await response.json()
      if (editingMaterial) {
        setMaterials((prev) => prev.map((m) => (m.id === data.id ? data : m)))
        toast.success("Material updated successfully!")
      } else {
        setMaterials((prev) => [...prev, data])
        toast.success("Material added successfully!")
      }
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to save material:", error)
      toast.error(`Failed to save material: ${error.message || "An unexpected error occurred"}`)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredMaterials = materials.filter(
    (material) =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.specifications?.processes &&
        material.specifications.processes.some((process: string) =>
          process.toLowerCase().includes(searchTerm.toLowerCase()),
        )),
  )

  const sortedMaterials = sortData(filteredMaterials, sortConfig)

  // Adjusting groupData to handle nested properties for processes
  const groupedMaterials = groupData(sortedMaterials, groupBy)

  const renderMaterialRow = (material: Material) => (
    <TableRow key={material.id} className="hover:bg-[#e8dcaa]/20 transition-colors">
      <TableCell className="font-medium text-[#525253]">{material.name}</TableCell>
      <TableCell className="font-mono">${material.cost.toFixed(2)}</TableCell>
      <TableCell className="font-medium">{material.markup}%</TableCell>
      <TableCell>{material.density} g/cm³</TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {material.specifications?.processes &&
            material.specifications.processes.map((process: string) => (
              <Badge
                key={process}
                variant="secondary"
                className="text-xs bg-[#d4c273] text-[#fefefe] hover:bg-[#d4c273]/80"
              >
                {process}
              </Badge>
            ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Switch checked={material.active} onCheckedChange={() => toggleMaterial(material.id)} />
          <Badge
            variant={material.active ? "default" : "secondary"}
            className={
              material.active ? "bg-[#d4c273] text-[#fefefe] hover:bg-[#d4c273]/80" : "bg-[#908d8d] text-[#fefefe]"
            }
          >
            {material.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(material)}
            className="hover:bg-[#d4c273]/20 hover:text-[#d4c273]"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(material.id)}
            className="hover:bg-red-50 hover:text-red-600"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  const renderTable = (materialsToRender: Material[], showHeader = true, isGrouped = false) => {
    const columnClasses = getTableColumnClasses().materials

    return (
      <Table>
        <TableHeader className={isGrouped ? "border-b-0" : ""}>
          <TableRow className="hover:bg-transparent border-[#908d8d]">
            <SortableTableHeader
              sortKey="name"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.name}
            >
              Material
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="cost"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.cost}
            >
              Cost per lb
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="markup"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.markup}
            >
              Markup %
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="density"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.density}
            >
              Density
            </SortableTableHeader>
            <TableHead className={columnClasses.processes}>Compatible Processes</TableHead>
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
        <TableBody>{materialsToRender.map(renderMaterialRow)}</TableBody>
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
        const materialData = {
          name: item.name || "",
          cost: Number(item.cost) || 0,
          markup: Number(item.markup) || 0,
          density: Number(item.density) || 0,
          unit: item.unit || "lb",
          active: item.active !== undefined ? item.active : true,
          specifications: {
            processes:
              typeof item.processes === "string"
                ? item.processes
                    .split(";")
                    .map((p) => p.trim())
                    .filter(Boolean)
                : item.processes || [],
          },
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/materials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(materialData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || `Failed to import material ${item.name}: HTTP error! status: ${response.status}`)
        }
        toast.success(`Material '${item.name}' imported successfully.`)
      } catch (error: any) {
        console.error(`Failed to import material '${item.name}':`, error)
        toast.error(`Failed to import material '${item.name}': ${error.message || "An unexpected error occurred"}`)
      }
    }
    fetchMaterials() // Re-fetch all materials after import
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fefefe] to-[#e8dcaa]/20">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="bg-[#fefefe] border border-[#908d8d] hover:bg-[#e8dcaa] rounded-xl p-2 shadow-sm" />
            <div className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-[#525253]">Materials</h1>
                <p className="text-lg text-[#908d8d]">Manage materials, costs, markups, and process compatibility</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="h-10 px-4 border-[#908d8d] hover:bg-[#e8dcaa] text-[#525253]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="h-10 px-4 border-[#908d8d] hover:bg-[#e8dcaa] text-[#525253]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleAdd}
                  className="h-10 px-4 bg-[#d4c273] hover:bg-[#d4c273]/80 text-[#fefefe] shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#fefefe] rounded-xl p-4 shadow-sm border border-[#908d8d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#908d8d]">Total Materials</p>
                  <p className="text-xl font-bold text-[#525253]">{materials.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#fefefe] rounded-xl p-4 shadow-sm border border-[#908d8d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#908d8d]">Active Materials</p>
                  <p className="text-xl font-bold text-[#525253]">{materials.filter((m) => m.active).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#fefefe] rounded-xl p-4 shadow-sm border border-[#908d8d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#908d8d]">Avg Markup</p>
                  <p className="text-xl font-bold text-[#525253]">
                    {materials.length > 0 ? Math.round(materials.reduce((sum, m) => sum + m.markup, 0) / materials.length) : 0}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#fefefe] rounded-xl p-4 shadow-sm border border-[#908d8d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#908d8d]">Avg Cost</p>
                  <p className="text-xl font-bold text-[#525253]">
                    ${
                      materials.length > 0
                        ? (materials.reduce((sum, m) => sum + m.cost, 0) / materials.length).toFixed(2)
                        : (0).toFixed(2)
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-[#fefefe] shadow-sm border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/50 to-[#fefefe] border-b border-[#908d8d] pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#d4c273] rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-[#fefefe]" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-[#525253]">Material Library</CardTitle>
                <CardDescription className="text-[#908d8d] mt-1">
                  Configure material properties and pricing
                </CardDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#908d8d]" />
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
              </div>
              <Button variant="outline" size="sm" className="border-[#908d8d] hover:bg-[#e8dcaa] text-[#525253]">
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
                {Object.entries(groupedMaterials).map(([groupValue, groupMaterials]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={groupBy}
                    groupValue={groupValue}
                    itemCount={groupMaterials.length}
                  >
                    {renderTable(groupMaterials, true, true)}
                  </GroupedTableSection>
                ))}
              </div>
            ) : (
              renderTable(sortedMaterials, true, false)
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-[#fefefe] rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#525253]">
                {editingMaterial ? "Edit Material" : "Add Material"}
              </DialogTitle>
              <DialogDescription className="text-[#908d8d]">
                Configure material properties and pricing parameters
              </DialogDescription>
            </DialogHeader>
            <form id="material-form" onSubmit={handleSaveMaterial}>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium text-[#525253]">
                    Material Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingMaterial?.name}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cost" className="text-sm font-medium text-[#525253]">
                      Cost per lb
                    </Label>
                    <Input
                      id="cost"
                      name="cost"
                      type="number"
                      step="0.01"
                      defaultValue={editingMaterial?.cost}
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="markup" className="text-sm font-medium text-[#525253]">
                      Markup %
                    </Label>
                    <Input
                      id="markup"
                      name="markup"
                      type="number"
                      defaultValue={editingMaterial?.markup}
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="density" className="text-sm font-medium text-[#525253]">
                    Density (g/cm³)
                  </Label>
                  <Input
                    id="density"
                    name="density"
                    type="number"
                    step="0.01"
                    defaultValue={editingMaterial?.density}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label className="text-sm font-medium text-[#525253]">Compatible Processes</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {["CNC Milling", "CNC Turning", "5-Axis", "Wire EDM"].map((process) => (
                      <div key={process} className="flex items-center space-x-2">
                        <Checkbox
                          id={`process-${process}`}
                          value={process}
                          defaultChecked={editingMaterial?.specifications?.processes?.includes(process)}
                        />
                        <Label htmlFor={`process-${process}`} className="text-sm text-[#525253]">
                          {process}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    name="active"
                    defaultChecked={editingMaterial?.active ?? true}
                  />
                  <Label htmlFor="active" className="text-sm font-medium text-[#525253]">
                    Active
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-[#908d8d] text-[#525253] hover:bg-[#e8dcaa]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#d4c273] hover:bg-[#d4c273]/80 text-[#fefefe]"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Material"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <CSVImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImport}
          entityType="materials"
          fieldMappings={materialFieldMappings}
        />

        <CSVExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          data={materials}
          entityType="materials"
          fieldMappings={materialFieldMappings}
        />
      </div>
    </div>
  )
}