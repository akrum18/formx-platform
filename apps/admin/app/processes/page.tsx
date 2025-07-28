"use client"

import { DialogFooter } from "@/components/ui/dialog"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVExportDialog } from "@/components/csv-export-dialog"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Settings, Upload, Download, Wrench, Search, Filter } from "lucide-react"
import { SortableTableHeader } from "@/components/sortable-table-header"
import { TableControls } from "@/components/table-controls"
import { GroupedTableSection } from "@/components/grouped-table-section"
import { sortData, groupData, type SortConfig, getTableColumnClasses } from "@/lib/table-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CategoryManager } from "@/components/category-manager"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  useProcesses,
  useCreateProcess,
  useUpdateProcess,
  useDeleteProcess,
  useToggleProcessActive,
  type Process as APIProcess
} from "@/lib/api/processes"

type Process = APIProcess


const defaultCategories = ["Machining", "Advanced Machining", "EDM", "Additive", "Finishing"]

const groupOptions = [
  { value: "active", label: "Status" },
  { value: "category", label: "Category" },
]

const processFieldMappings = {
  name: { label: "Process Name", required: true, type: "string" },
  category: { label: "Category", required: true, type: "select", options: defaultCategories },
  setupTime: { label: "Setup Time (min)", required: true, type: "number" },
  hourlyRate: { label: "Hourly Rate ($)", required: true, type: "number" },
  minimumCost: { label: "Minimum Cost ($)", required: true, type: "number" },
  complexityMultiplier: { label: "Complexity Multiplier", required: true, type: "number" },
  active: { label: "Active", required: false, type: "boolean" },
}

export default function ProcessesPage() {
  const { data: processes = [], isLoading, error } = useProcesses()
  const createProcess = useCreateProcess()
  const updateProcess = useUpdateProcess()
  const deleteProcess = useDeleteProcess()
  const toggleActive = useToggleProcessActive()
  const [categories, setCategories] = useState<string[]>(defaultCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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

  const handleSave = async (processData: Partial<Process>) => {
    try {
      if (editingProcess) {
        await updateProcess.mutateAsync({ 
          id: editingProcess.id, 
          data: processData 
        })
      } else {
        await createProcess.mutateAsync({
          name: processData.name || "",
          setupTime: processData.setupTime || 0,
          hourlyRate: processData.hourlyRate || 0,
          minimumCost: processData.minimumCost || 0,
          complexityMultiplier: processData.complexityMultiplier || 1.0,
          category: processData.category || categories[0],
          active: processData.active ?? true,
        })
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving process:', error)
    }
  }

  const toggleProcess = (id: string, active: boolean) => {
    toggleActive.mutate({ id, active })
  }

  const handleCategoriesUpdate = (newCategories: string[]) => {
    setCategories(newCategories)
    // Note: In a real implementation, you'd need to update processes with invalid categories
    // For now, we'll just update the categories list
  }

  const filteredProcesses = processes.filter(
    (process) =>
      process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedProcesses = sortData(filteredProcesses, sortConfig)
  const groupedProcesses = groupData(sortedProcesses, groupBy)

  const renderProcessRow = (process: Process) => (
    <TableRow key={process.id} className="hover:bg-[#e8dcaa]/20 transition-colors">
      <TableCell className="font-medium text-slate-900">{process.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {process.category}
        </Badge>
      </TableCell>
      <TableCell>{process.setupTime} min</TableCell>
      <TableCell className="font-mono">${process.hourlyRate}/hr</TableCell>
      <TableCell className="font-mono">${process.minimumCost}</TableCell>
      <TableCell className="font-medium">{process.complexityMultiplier}x</TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Switch 
            checked={process.active} 
            onCheckedChange={(checked) => toggleProcess(process.id, checked)}
            disabled={toggleActive.isPending}
          />
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(process)}
          className="hover:bg-[#d4c273]/20 hover:text-[#525253]"
        >
          <Edit className="h-4 w-4" />
        </Button>
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
              sortKey="category"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.category}
            >
              Category
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="setupTime"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.setupTime}
            >
              Setup Time
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="hourlyRate"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.hourlyRate}
            >
              Hourly Rate
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="minimumCost"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.minimumCost}
            >
              Minimum Cost
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="complexityMultiplier"
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

  const handleImport = (importedData: any[]) => {
    const newProcesses = importedData.map((item, index) => ({
      id: (Date.now() + index).toString(),
      name: item.name || "",
      category: item.category || categories[0] || "Uncategorized",
      setupTime: Number(item.setupTime) || 0,
      hourlyRate: Number(item.hourlyRate) || 0,
      minimumCost: Number(item.minimumCost) || 0,
      complexityMultiplier: Number(item.complexityMultiplier) || 1.0,
      active: item.active !== undefined ? item.active : true,
    }))

    // Note: CSV import would need to call the API to create processes
    // For now, this is a placeholder for the import functionality
    console.log('Would create processes via API:', newProcesses)
    console.log(`Imported ${newProcesses.length} processes`)
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
                  <p className="text-xl font-bold text-slate-900">{isLoading ? '...' : processes.length}</p>
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
                  <p className="text-xl font-bold text-slate-900">{isLoading ? '...' : processes.filter((p) => p.active).length}</p>
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
                    {isLoading || processes.length === 0 ? '...' : `$${Math.round(processes.reduce((sum, p) => sum + p.hourlyRate, 0) / processes.length)}/hr`}
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">Error loading processes: {error.message}</p>
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
                <div className="text-slate-600">Loading processes...</div>
              </div>
            ) : groupBy ? (
              <div>
                {Object.entries(groupedProcesses).map(([groupValue, groupProcesses]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={groupBy}
                    groupValue={groupValue}
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
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const processData = {
                  name: formData.get("name") as string,
                  setupTime: Number(formData.get("setupTime")),
                  hourlyRate: Number(formData.get("hourlyRate")),
                  minimumCost: Number(formData.get("minimumCost")),
                  complexityMultiplier: Number(formData.get("complexityMultiplier")),
                  category: formData.get("category") as string,
                  active: formData.get("active") === "on",
                }
                handleSave(processData)
              }}
            >
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
                  <Label htmlFor="category" className="text-sm font-medium text-slate-700">
                    Category
                  </Label>
                  <Select name="category" defaultValue={editingProcess?.category || categories[0]}>
                    <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="setupTime" className="text-sm font-medium text-slate-700">
                      Setup Time (min)
                    </Label>
                    <Input
                      id="setupTime"
                      name="setupTime"
                      type="number"
                      defaultValue={editingProcess?.setupTime}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hourlyRate" className="text-sm font-medium text-slate-700">
                      Hourly Rate ($)
                    </Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      defaultValue={editingProcess?.hourlyRate}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minimumCost" className="text-sm font-medium text-slate-700">
                      Minimum Cost ($)
                    </Label>
                    <Input
                      id="minimumCost"
                      name="minimumCost"
                      type="number"
                      defaultValue={editingProcess?.minimumCost}
                      required
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="complexityMultiplier" className="text-sm font-medium text-slate-700">
                      Complexity Multiplier
                    </Label>
                    <Input
                      id="complexityMultiplier"
                      name="complexityMultiplier"
                      type="number"
                      step="0.1"
                      defaultValue={editingProcess?.complexityMultiplier}
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
                <Button 
                  type="submit" 
                  className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]"
                  disabled={createProcess.isPending || updateProcess.isPending}
                >
                  {createProcess.isPending || updateProcess.isPending
                    ? 'Saving...' 
                    : editingProcess ? "Save Changes" : "Add Process"
                  }
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
          categories={categories}
          onCategoriesUpdate={handleCategoriesUpdate}
          title="Process Categories"
          description="Manage process categories for organizing manufacturing processes"
        />
      </div>
    </div>
  )
}
