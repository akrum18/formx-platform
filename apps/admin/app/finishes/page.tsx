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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Upload, Download, Palette, Search, Filter } from "lucide-react"
import { SortableTableHeader } from "@/components/sortable-table-header"
import { TableControls } from "@/components/table-controls"
import { GroupedTableSection } from "@/components/grouped-table-section"
import { sortData, groupData, type SortConfig } from "@/lib/table-utils"
import { Switch } from "@/components/ui/switch"
import { getTableColumnClasses } from "@/lib/table-utils"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVExportDialog } from "@/components/csv-export-dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useFinishes, useCreateFinish, useUpdateFinish, useDeleteFinish, useToggleFinishActive, type Finish } from "@/lib/api/finishes"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"


export default function FinishesPage() {
  // API hooks
  const { data: finishes = [], isLoading, error } = useFinishes()
  const createFinish = useCreateFinish()
  const updateFinish = useUpdateFinish()
  const deleteFinish = useDeleteFinish()
  const toggleFinishActive = useToggleFinishActive()

  // UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFinish, setEditingFinish] = useState<Finish | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    costPerSqIn: 0,
    leadTimeDays: 0,
    description: "",
    active: true
  })

  const groupOptions = [
    { value: "active", label: "Status" },
    { value: "type", label: "Type" },
  ]

  const finishFieldMappings = {
    name: { label: "Finish Name", required: true, type: "string" },
    type: {
      label: "Type",
      required: true,
      type: "select",
      options: ["Anodizing", "Powder Coating", "Plating", "Chemical", "Paint"],
    },
    costPerSqIn: { label: "Cost per sq in", required: true, type: "number" },
    leadTimeDays: { label: "Lead Time (days)", required: true, type: "number" },
    description: { label: "Description", required: false, type: "string" },
    active: { label: "Active", required: false, type: "boolean" },
  }

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const toggleFinish = (id: string) => {
    const finish = finishes.find((f) => f.id === id)
    if (finish) {
      toggleFinishActive.mutate({ id, active: !finish.active })
    }
  }

  const handleEdit = (finish: Finish) => {
    setEditingFinish(finish)
    setFormData({
      name: finish.name,
      type: finish.type,
      costPerSqIn: finish.costPerSqIn,
      leadTimeDays: finish.leadTimeDays,
      description: finish.description || "",
      active: finish.active
    })
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingFinish(null)
    setFormData({
      name: "",
      type: "",
      costPerSqIn: 0,
      leadTimeDays: 0,
      description: "",
      active: true
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      return // Basic validation
    }

    try {
      if (editingFinish) {
        // Update existing finish
        await updateFinish.mutateAsync({
          id: editingFinish.id,
          data: formData
        })
      } else {
        // Create new finish
        await createFinish.mutateAsync(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save finish:', error)
    }
  }

  const filteredFinishes = finishes.filter(
    (finish) =>
      finish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finish.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finish.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedFinishes = sortData(filteredFinishes, sortConfig)
  const groupedFinishes = groupData(sortedFinishes, groupBy)

  const renderFinishRow = (finish: Finish) => (
    <TableRow key={finish.id} className="hover:bg-slate-50/50 transition-colors">
      <TableCell className="font-medium text-slate-900">{finish.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          {finish.type}
        </Badge>
      </TableCell>
      <TableCell className="font-mono">${finish.costPerSqIn.toFixed(3)}</TableCell>
      <TableCell>{finish.leadTimeDays} days</TableCell>
      <TableCell className="max-w-xs truncate text-slate-600">{finish.description}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Switch checked={finish.active} onCheckedChange={() => toggleFinish(finish.id)} />
          <Badge
            variant={finish.active ? "default" : "secondary"}
            className={finish.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600"}
          >
            {finish.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(finish)}
            className="hover:bg-blue-50 hover:text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-red-50 hover:text-red-600"
            onClick={() => deleteFinish.mutate(finish.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  const renderTable = (finishesToRender: Finish[], showHeader = true, isGrouped = false) => {
    const columnClasses = getTableColumnClasses().finishes

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
              Finish Name
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="type"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.type}
            >
              Type
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="costPerSqIn"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.cost}
            >
              Cost per in²
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="leadTimeDays"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.leadTime}
            >
              Lead Time
            </SortableTableHeader>
            <TableHead className={columnClasses.description}>Description</TableHead>
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
        <TableBody>{finishesToRender.map(renderFinishRow)}</TableBody>
      </Table>
    )
  }

  const handleImport = async (importedData: any[]) => {
    try {
      // Import finishes one by one using the create mutation
      for (const finishData of importedData) {
        await createFinish.mutateAsync({
          name: finishData.name,
          type: finishData.type,
          costPerSqIn: parseFloat(finishData.costPerSqIn) || 0,
          leadTimeDays: parseInt(finishData.leadTimeDays) || 0,
          description: finishData.description || "",
          active: finishData.active !== undefined ? finishData.active : true
        })
      }
      console.log(`Successfully imported ${importedData.length} finishes`)
    } catch (error) {
      console.error('Failed to import finishes:', error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-700">
              Failed to load finishes: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
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
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">Finishes & Coatings</h1>
                <p className="text-lg text-slate-600">Manage finish types, costs, and lead times</p>
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
                  onClick={handleAdd}
                  className="h-10 px-4 bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe] shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Finish
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Finishes</p>
                  <p className="text-xl font-bold text-slate-900">{finishes.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Finishes</p>
                  <p className="text-xl font-bold text-slate-900">{finishes.filter((f) => f.active).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Finish Types</p>
                  <p className="text-xl font-bold text-slate-900">{[...new Set(finishes.map((f) => f.type))].length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Lead Time</p>
                  <p className="text-xl font-bold text-slate-900">
                    {Math.round(finishes.reduce((sum, f) => sum + f.leadTimeDays, 0) / finishes.length)} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#d4c273] rounded-xl flex items-center justify-center">
                <Palette className="w-5 h-5 text-[#fefefe]" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Finish Library</CardTitle>
                <CardDescription className="text-slate-600 mt-1">Configure finish options and pricing</CardDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search finishes..."
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
                {Object.entries(groupedFinishes).map(([groupValue, groupFinishes]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={groupBy}
                    groupValue={groupValue}
                    itemCount={groupFinishes.length}
                  >
                    {renderTable(groupFinishes, true, true)}
                  </GroupedTableSection>
                ))}
              </div>
            ) : (
              renderTable(sortedFinishes, true, false)
            )}
          </CardContent>
        </Card>

        <CSVImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImport}
          entityType="finishes"
          fieldMappings={finishFieldMappings}
        />

        <CSVExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          data={finishes}
          entityType="finishes"
          fieldMappings={finishFieldMappings}
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {editingFinish ? "Edit Finish" : "Add Finish"}
              </DialogTitle>
              <DialogDescription className="text-slate-600">Configure finish properties and pricing</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Finish Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-sm font-medium text-slate-700">
                  Type
                </Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select finish type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Anodizing">Anodizing</SelectItem>
                    <SelectItem value="Powder Coating">Powder Coating</SelectItem>
                    <SelectItem value="Plating">Plating</SelectItem>
                    <SelectItem value="Chemical">Chemical</SelectItem>
                    <SelectItem value="Paint">Paint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cost" className="text-sm font-medium text-slate-700">
                    Cost per in²
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.001"
                    value={formData.costPerSqIn}
                    onChange={(e) => setFormData(prev => ({ ...prev, costPerSqIn: parseFloat(e.target.value) || 0 }))}
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="leadTime" className="text-sm font-medium text-slate-700">
                    Lead Time (days)
                  </Label>
                  <Input
                    id="leadTime"
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) || 0 }))}
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createFinish.isPending || updateFinish.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createFinish.isPending || updateFinish.isPending ? "Saving..." : "Save Finish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
