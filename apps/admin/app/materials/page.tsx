"use client"

import { useState, useEffect } from "react"
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
import {
  useMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useToggleMaterialActive,
  type Material as APIMaterial
} from "@/lib/api/materials"
import { useProcesses, type Process } from "@/lib/api/processes"

type Material = APIMaterial


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
  const { data: materials = [], isLoading, error } = useMaterials()
  const { data: processes = [], isLoading: processesLoading } = useProcesses({ active: true })
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()
  const deleteMaterial = useDeleteMaterial()
  const toggleActive = useToggleMaterialActive()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([])
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const toggleMaterial = (id: string, active: boolean) => {
    toggleActive.mutate({ id, active })
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setSelectedProcessIds(material.processIds || [])
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingMaterial(null)
    setSelectedProcessIds([])
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedProcessIds([])
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    // Extract form values
    const materialData = {
      name: formData.get('name') as string,
      cost: parseFloat(formData.get('cost') as string),
      markup: parseFloat(formData.get('markup') as string),
      density: parseFloat(formData.get('density') as string),
      unit: formData.get('unit') as string || 'lb',
      active: formData.get('active') === 'on',
      processIds: selectedProcessIds
    }

    try {
      if (editingMaterial) {
        await updateMaterial.mutateAsync({ id: editingMaterial.id, data: materialData })
      } else {
        await createMaterial.mutateAsync(materialData)
      }
      handleDialogClose()
    } catch (error) {
      console.error('Error saving material:', error)
    }
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
          <Switch 
            checked={material.active} 
            onCheckedChange={(checked) => toggleMaterial(material.id, checked)} 
            disabled={toggleActive.isPending}
          />
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
              Cost per Unit
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
    const materialsToCreate = importedData.map((item) => ({
      name: item.name || "",
      cost: Number(item.cost) || 0,
      markup: Number(item.markup) || 0,
      density: Number(item.density) || 0,
      unit: item.unit || "lb",
      processIds:
        typeof item.processes === "string"
          ? item.processes
              .split(";")
              .map((p: string) => p.trim())
              .filter(Boolean)
          : item.processes || [],
      active: item.active !== undefined ? item.active : true,
    }))

    try {
      // Create materials one by one using the API
      const results = await Promise.allSettled(
        materialsToCreate.map(materialData => createMaterial.mutateAsync(materialData))
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length
      
      console.log(`Successfully imported ${successful} materials${failed > 0 ? `, ${failed} failed` : ''}`)
    } catch (error) {
      console.error('Failed to import materials:', error)
    }
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
                  <p className="text-xl font-bold text-[#525253]">{isLoading ? '...' : materials.length}</p>
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
                  <p className="text-xl font-bold text-[#525253]">{isLoading ? '...' : materials.filter((m) => m.active).length}</p>
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
                    {isLoading || materials.length === 0 ? '...' : Math.round(materials.reduce((sum, m) => sum + m.markup, 0) / materials.length)}%
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
                    {isLoading || materials.length === 0 ? '...' : `$${(materials.reduce((sum, m) => sum + m.cost, 0) / materials.length).toFixed(2)}`}
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">Error loading materials: {error.message}</p>
              </div>
            )}
            
            <TableControls
              groupOptions={groupOptions}
              currentGroup={groupBy}
              onGroupChange={setGroupBy}
              onClearGroup={() => setGroupBy("")}
            />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-[#908d8d]">Loading materials...</div>
              </div>
            ) : groupBy ? (
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

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[500px] bg-[#fefefe] rounded-2xl border-0 shadow-xl">
            <form onSubmit={handleSave}>
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
              <input type="hidden" name="unit" value="lb" />
              <div className="grid gap-3">
                <Label className="text-sm font-medium text-[#525253]">Compatible Processes</Label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {processesLoading ? (
                    <div className="col-span-2 text-center text-slate-500 text-sm">Loading processes...</div>
                  ) : processes.map((process) => (
                    <div key={process.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={process.id} 
                        checked={selectedProcessIds.includes(process.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProcessIds([...selectedProcessIds, process.id])
                          } else {
                            setSelectedProcessIds(selectedProcessIds.filter(id => id !== process.id))
                          }
                        }}
                      />
                      <Label htmlFor={process.id} className="text-sm text-[#525253]">
                        {process.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  className="border-[#908d8d] text-[#525253] hover:bg-[#e8dcaa]"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#d4c273] hover:bg-[#d4c273]/80 text-[#fefefe]">
                  Save Material
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
