"use client"

import { useState } from "react"
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

interface Material {
  id: string
  name: string
  cost: number
  markup: number
  density: number
  unit: string
  processes: string[]
  active: boolean
}

const mockMaterials: Material[] = [
  {
    id: "1",
    name: "Aluminum 6061",
    cost: 3.5,
    markup: 25,
    density: 2.7,
    unit: "lb",
    processes: ["CNC Milling", "CNC Turning", "5-Axis"],
    active: true,
  },
  {
    id: "2",
    name: "Steel 1018",
    cost: 2.8,
    markup: 30,
    density: 7.87,
    unit: "lb",
    processes: ["CNC Milling", "CNC Turning"],
    active: true,
  },
  {
    id: "3",
    name: "Titanium Ti-6Al-4V",
    cost: 45.0,
    markup: 40,
    density: 4.43,
    unit: "lb",
    processes: ["5-Axis", "CNC Milling"],
    active: false,
  },
  {
    id: "4",
    name: "Stainless Steel 316",
    cost: 4.2,
    markup: 35,
    density: 8.0,
    unit: "lb",
    processes: ["CNC Milling", "CNC Turning"],
    active: true,
  },
  {
    id: "5",
    name: "Brass C360",
    cost: 6.8,
    markup: 28,
    density: 8.5,
    unit: "lb",
    processes: ["CNC Turning", "CNC Milling"],
    active: false,
  },
]

const groupOptions = [
  { value: "active", label: "Status" },
  { value: "unit", label: "Unit" },
  { value: "processes.0", label: "Primary Process" },
]

const materialFieldMappings = {
  name: { label: "Material Name", required: true, type: "string" },
  cost: { label: "Cost per lb", required: true, type: "number" },
  markup: { label: "Markup %", required: true, type: "number" },
  density: { label: "Density (g/cm³)", required: true, type: "number" },
  unit: { label: "Unit", required: false, type: "string" },
  active: { label: "Active", required: false, type: "boolean" },
  processes: { label: "Compatible Processes", required: false, type: "string" },
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>(mockMaterials)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const toggleMaterial = (id: string) => {
    setMaterials(materials.map((m) => (m.id === id ? { ...m, active: !m.active } : m)))
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingMaterial(null)
    setIsDialogOpen(true)
  }

  const filteredMaterials = materials.filter(
    (material) =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.processes.some((process) => process.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const sortedMaterials = sortData(filteredMaterials, sortConfig)
  const groupedMaterials = groupData(sortedMaterials, groupBy)

  const renderMaterialRow = (material: Material) => (
    <TableRow key={material.id} className="hover:bg-[#e8dcaa]/20 transition-colors">
      <TableCell className="font-medium text-[#525253]">{material.name}</TableCell>
      <TableCell className="font-mono">${material.cost.toFixed(2)}</TableCell>
      <TableCell className="font-medium">{material.markup}%</TableCell>
      <TableCell>{material.density} g/cm³</TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {material.processes.map((process) => (
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
          <Button variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600">
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
              Cost per {mockMaterials[0]?.unit}
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

  const handleImport = (importedData: any[]) => {
    const newMaterials = importedData.map((item, index) => ({
      id: (Date.now() + index).toString(),
      name: item.name || "",
      cost: Number(item.cost) || 0,
      markup: Number(item.markup) || 0,
      density: Number(item.density) || 0,
      unit: item.unit || "lb",
      processes:
        typeof item.processes === "string"
          ? item.processes
              .split(";")
              .map((p) => p.trim())
              .filter(Boolean)
          : item.processes || [],
      active: item.active !== undefined ? item.active : true,
    }))

    setMaterials([...materials, ...newMaterials])
    console.log(`Imported ${newMaterials.length} materials`)
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
                    {Math.round(materials.reduce((sum, m) => sum + m.markup, 0) / materials.length)}%
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
                    ${(materials.reduce((sum, m) => sum + m.cost, 0) / materials.length).toFixed(2)}
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
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm font-medium text-[#525253]">
                  Material Name
                </Label>
                <Input
                  id="name"
                  defaultValue={editingMaterial?.name}
                  className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cost" className="text-sm font-medium text-[#525253]">
                    Cost per lb
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    defaultValue={editingMaterial?.cost}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="markup" className="text-sm font-medium text-[#525253]">
                    Markup %
                  </Label>
                  <Input
                    id="markup"
                    type="number"
                    defaultValue={editingMaterial?.markup}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="density" className="text-sm font-medium text-[#525253]">
                  Density (g/cm³)
                </Label>
                <Input
                  id="density"
                  type="number"
                  step="0.01"
                  defaultValue={editingMaterial?.density}
                  className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
              </div>
              <div className="grid gap-3">
                <Label className="text-sm font-medium text-[#525253]">Compatible Processes</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["CNC Milling", "CNC Turning", "5-Axis", "Wire EDM"].map((process) => (
                    <div key={process} className="flex items-center space-x-2">
                      <Checkbox id={process} defaultChecked={editingMaterial?.processes.includes(process)} />
                      <Label htmlFor={process} className="text-sm text-[#525253]">
                        {process}
                      </Label>
                    </div>
                  ))}
                </div>
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
              <Button type="submit" className="bg-[#d4c273] hover:bg-[#d4c273]/80 text-[#fefefe]">
                Save Material
              </Button>
            </DialogFooter>
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
