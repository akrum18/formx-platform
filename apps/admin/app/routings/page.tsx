"use client"

import React from "react"
  import { getProcesses } from "@/lib/api-routings";
import { createRouting, getRoutings as fetchRoutingsFromApi } from "@/lib/api-routings";
// TODO: Replace with real API call
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
import {
  Plus,
  Edit,
  Trash2,
  Route,
  ArrowRight,
  GripVertical,
  Settings,
  Copy,
  Calculator,
  DollarSign,
} from "lucide-react"
import { SortableTableHeader } from "@/components/sortable-table-header"
import { getCategories, createCategory, updateCategory, deleteCategory, Category as RoutingCategory } from "@/lib/api-categories"
import { CategoryManager } from "@/components/category-manager"
import { TableControls } from "@/components/table-controls"
import { GroupedTableSection } from "@/components/grouped-table-section"
import { sortData, groupData, type SortConfig } from "@/lib/table-utils"
import { Switch } from "@/components/ui/switch"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Separator } from "@/components/ui/separator"

interface RoutingStep {
  id: string
  processId: string
  processName: string
  sequence: number
  setupTimeMultiplier: number
  runtimeMultiplier: number
  notes?: string
  // Pricing data from process
  setupTime: number // minutes
  hourlyRate: number // $/hour
  minimumCost: number // $
  complexityMultiplier: number
}

interface Routing {
  id: string
  name: string
  description: string
  category: string
  steps: RoutingStep[]
  totalSetupTime: number
  estimatedLeadTime: number
  active: boolean
  createdAt: string
  updatedAt: string
  // Pricing configuration
  materialMarkup: number // %
  finishingCost: number // $ per sq in
  isPrimaryPricingRoute: boolean
}




export default function RoutingsPage() {
// --- Routing Category State ---
  const [routingCategories, setRoutingCategories] = useState<RoutingCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const fetchRoutingCategories = async () => {
    setLoadingCategories(true)
    setCategoryError(null)
    try {
      const cats = await getCategories("routing")
      setRoutingCategories(cats)
    } catch (err: any) {
      setCategoryError(err?.message || "Failed to load routing categories")
    } finally {
      setLoadingCategories(false)
    }
  }

  React.useEffect(() => {
    fetchRoutingCategories()
  }, [])

  // CRUD handlers for CategoryManager (add, edit, delete)
  const handleAddCategory = async (name: string) => {
    await createCategory({ name, type: "routing" })
    await fetchRoutingCategories()
  }
  const handleUpdateCategory = async (id: string, name: string) => {
    await updateCategory(id, { name })
    await fetchRoutingCategories()
  }
  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    await fetchRoutingCategories()
  }

  
  const [processes, setProcesses] = useState<any[]>([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [processesError, setProcessesError] = useState<string | null>(null);
  const [processCategories, setProcessCategories] = useState<RoutingCategory[]>([]);
  const [loadingProcessCategories, setLoadingProcessCategories] = useState(false);
  const [processCategoriesError, setProcessCategoriesError] = useState<string | null>(null);
  
  React.useEffect(() => {
    setLoadingProcessCategories(true);
    setProcessCategoriesError(null);
    getCategories("process")
      .then(setProcessCategories)
      .catch(err => setProcessCategoriesError(err.message || "Failed to load process categories"))
      .finally(() => setLoadingProcessCategories(false));
  }, []);
  
  React.useEffect(() => {
    setProcessesLoading(true);
    setProcessesError(null);
    getProcesses()
      .then(setProcesses)
      .catch(err => setProcessesError(err.message || "Failed to load processes"))
      .finally(() => setProcessesLoading(false));
  }, []);
  const [routings, setRoutings] = useState<Routing[]>([])


React.useEffect(() => {
  const fetchRoutings = async () => {
    // Fetch routings from API and update state
    try {
      const { routings } = await fetchRoutingsFromApi();
      setRoutings(Array.isArray(routings) ? routings : []);
    } catch (err) {
      // Optionally set error state/toast
      console.error("Failed to fetch routings", err);
    }
  };
  fetchRoutings();
}, []);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRouting, setEditingRouting] = useState<Routing | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")

  const groupOptions = [
    { value: "active", label: "Status" },
    { value: "category", label: "Category" },
    { value: "steps.length", label: "Complexity" },
  ]

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const toggleRouting = (id: string) => {
    setRoutings(routings.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))
  }

  const setPrimaryRoute = (id: string) => {
    setRoutings(routings.map((r) => ({ ...r, isPrimaryPricingRoute: r.id === id })))
  }

  const handleEdit = (routing: Routing) => {
    setEditingRouting(routing)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingRouting(null)
    setIsDialogOpen(true)
  }

  const handleDuplicate = (routing: Routing) => {
    const duplicatedRouting: Routing = {
      ...routing,
      id: Date.now().toString(),
      name: `${routing.name} (Copy)`,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      isPrimaryPricingRoute: false,
    }
    setRoutings([...routings, duplicatedRouting])
  }

  const calculateRoutingCost = (routing: Routing, quantity = 1, materialCost = 100) => {
    let totalSetupCost = 0
    let totalRuntimeCost = 0
    let totalMinimumCost = 0

    routing.steps.forEach((step) => {
      const setupCost = ((step.setupTime * step.setupTimeMultiplier) / 60) * step.hourlyRate
      const runtimeCost = ((30 * step.runtimeMultiplier) / 60) * step.hourlyRate * step.complexityMultiplier // Assuming 30 min runtime

      totalSetupCost += setupCost
      totalRuntimeCost += runtimeCost * quantity
      totalMinimumCost = Math.max(totalMinimumCost, step.minimumCost)
    })

    const processingCost = Math.max(totalSetupCost + totalRuntimeCost, totalMinimumCost)
    const materialCostWithMarkup = materialCost * (1 + routing.materialMarkup / 100)
    const finishingCost = routing.finishingCost * 100 // Assuming 100 sq in surface area

    return {
      processingCost,
      materialCost: materialCostWithMarkup,
      finishingCost,
      totalCost: processingCost + materialCostWithMarkup + finishingCost,
    }
  }

  const filteredRoutings = (routings ?? []).filter(
    (routing) =>
      routing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      routing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      routing.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedRoutings = sortData(filteredRoutings, sortConfig)
  const groupedRoutings = groupData(sortedRoutings, groupBy)

  const renderRoutingRow = (routing: Routing) => {
    const costBreakdown = calculateRoutingCost(routing)

    return (
      <TableRow key={routing.id} className="hover:bg-[#e8dcaa]/20 transition-colors">
        <TableCell className="font-medium text-slate-900">
          <div className="flex items-center gap-2">
            {routing.isPrimaryPricingRoute && (
              <Badge variant="default" className="bg-blue-100 text-blue-700 text-xs">
                PRIMARY
              </Badge>
            )}
            {routing.name}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {routing.category}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {routing.steps.slice(0, 3).map((step, index) => (
              <div key={step.id} className="flex items-center">
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 px-1 py-0">
                  {step.processName.split(" ")[0]}
                </Badge>
                {index < Math.min(routing.steps.length - 1, 2) && (
                  <ArrowRight className="h-3 w-3 mx-1 text-slate-400" />
                )}
              </div>
            ))}
            {routing.steps.length > 3 && (
              <span className="text-xs text-slate-500 ml-1">+{routing.steps.length - 3}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center font-medium">{routing.steps.length}</TableCell>
        <TableCell>{routing.estimatedLeadTime} days</TableCell>
        <TableCell className="font-mono text-sm">
          <div className="text-right">
            <div className="font-semibold text-slate-900">${costBreakdown.totalCost.toFixed(0)}</div>
            <div className="text-xs text-slate-500">per unit</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-3">
            <Switch checked={routing.active} onCheckedChange={() => toggleRouting(routing.id)} />
            <Badge
              variant={routing.active ? "default" : "secondary"}
              className={
                routing.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600"
              }
            >
              {routing.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(routing)}
              className="hover:bg-[#d4c273]/20 hover:text-[#525253]"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPrimaryRoute(routing.id)}
              className="hover:bg-purple-50 hover:text-purple-600"
              title="Set as primary pricing route"
            >
              <Calculator className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDuplicate(routing)}
              className="hover:bg-green-50 hover:text-green-600"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  const renderTable = (routingsToRender: Routing[], showHeader = true, isGrouped = false) => (
    <Table>
      <TableHeader className={isGrouped ? "border-b-0" : ""}>
        <TableRow className="hover:bg-transparent border-slate-200">
          <SortableTableHeader sortKey="name" currentSort={sortConfig} onSort={handleSort} className="w-[180px]">
            Routing Name
          </SortableTableHeader>
          <SortableTableHeader sortKey="category" currentSort={sortConfig} onSort={handleSort} className="w-[100px]">
            Category
          </SortableTableHeader>
          <TableHead className="w-[200px]">Process Flow</TableHead>
          <SortableTableHeader sortKey="steps.length" currentSort={sortConfig} onSort={handleSort} className="w-[80px]">
            Steps
          </SortableTableHeader>
          <SortableTableHeader
            sortKey="estimatedLeadTime"
            currentSort={sortConfig}
            onSort={handleSort}
            className="w-[100px]"
          >
            Lead Time
          </SortableTableHeader>
          <TableHead className="w-[90px]">Est. Cost</TableHead>
          <SortableTableHeader sortKey="active" currentSort={sortConfig} onSort={handleSort} className="w-[120px]">
            Status
          </SortableTableHeader>
          <TableHead className="w-[140px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{routingsToRender.map(renderRoutingRow)}</TableBody>
    </Table>
  )

  const primaryRoute = routings.find((r) => r.isPrimaryPricingRoute)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl p-2 shadow-sm" />
            <div className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">Manufacturing Routings</h1>
                <p className="text-lg text-slate-600">
                  Build pricing-driven workflows from single operations to complex multi-step fabrication
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAdd}
                  className="h-10 px-4 bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe] shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Routing
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Route className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Routings</p>
                  <p className="text-xl font-bold text-slate-900">{routings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Route className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Routings</p>
                  <p className="text-xl font-bold text-slate-900">{routings.filter((r) => r.active).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Complexity</p>
                  <p className="text-xl font-bold text-slate-900">
                    {(routings.reduce((sum, r) => sum + r.steps.length, 0) / routings.length).toFixed(1)} avg steps
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Primary Route</p>
                  <p className="text-lg font-bold text-slate-900">{primaryRoute?.name.split(" - ")[0] || "None"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Pricing Route Alert */}
        {primaryRoute && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Primary Pricing Route: {primaryRoute.name}</p>
                  <p className="text-sm text-blue-700">
                    This routing drives the main pricing engine for estimates and quotes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Route className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Routing Library</CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Pricing-driven workflows from simple operations to complex fabrication sequences
                </CardDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Search routings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
              </div>
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
                {Object.entries(groupedRoutings).map(([groupValue, groupRoutings]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={groupBy}
                    groupValue={groupValue}
                    itemCount={groupRoutings.length}
                  >
                    {renderTable(groupRoutings, true, true)}
                  </GroupedTableSection>
                ))}
              </div>
            ) : (
              renderTable(sortedRoutings, true, false)
            )}
          </CardContent>
        </Card>
<CategoryManager
  isOpen={isCategoryManagerOpen}
  onClose={() => setIsCategoryManagerOpen(false)}
  categories={routingCategories.map(cat => cat.name)}
  onCategoriesUpdate={async (updatedNames) => {
    const oldNames = routingCategories.map(cat => cat.name);
    const toAdd = updatedNames.filter(n => !oldNames.includes(n));
    const toDelete = oldNames.filter(n => !updatedNames.includes(n));
    for (const name of toAdd) {
      await createCategory({ name, type: "routing" });
    }
    for (const name of toDelete) {
      const cat = routingCategories.find(c => c.name === name);
      if (cat) await deleteCategory(cat.id);
    }
    await fetchRoutingCategories();
  }}
  title="Manage Routing Categories"
  description="Add, edit, or remove routing categories used for organizing workflows."
/>
<RoutingDialog
  isOpen={isDialogOpen}
  onClose={() => setIsDialogOpen(false)}
  routing={editingRouting}
  processes={processes}
  processesLoading={processesLoading}
  processesError={processesError}
  processCategories={processCategories}
  loadingProcessCategories={loadingProcessCategories}
  processCategoriesError={processCategoriesError}
  onSave={async (routingData) => {
    if (editingRouting) {
      setRoutings(routings.map((r) => (r.id === editingRouting.id ? { ...r, ...routingData } : r)))
    } else {
      // Pass the extended routing data with categoryId
      await createRouting(routingData as any);
      const { routings } = await fetchRoutingsFromApi();
      setRoutings(Array.isArray(routings) ? routings : []);
    }
    setIsDialogOpen(false);
  }}
  routingCategories={routingCategories}
  loadingCategories={loadingCategories}
  categoryError={categoryError}
  isCategoryManagerOpen={isCategoryManagerOpen}
  setIsCategoryManagerOpen={setIsCategoryManagerOpen}
/>
      </div>
    </div>
  )
}

interface RoutingDialogProps {
  isCategoryManagerOpen: boolean;
  setIsCategoryManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean
  onClose: () => void
  routing: Routing | null
  processes: Array<any>;
  processesLoading: boolean;
  processesError: string | null;
  processCategories: RoutingCategory[];
  loadingProcessCategories: boolean;
  processCategoriesError: string | null;
  onSave: (routing: Partial<Routing>) => void
  routingCategories: RoutingCategory[]
  loadingCategories: boolean
  categoryError: string | null;
}

function RoutingDialog({ isOpen, onClose, routing, processes, onSave, routingCategories, loadingCategories, categoryError, isCategoryManagerOpen, setIsCategoryManagerOpen }: RoutingDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    categoryId: "", // Add categoryId field
    estimatedLeadTime: 5,
    active: true,
    steps: [] as RoutingStep[],
    materialMarkup: 35,
    finishingCost: 0,
  })

  const [selectedProcessId, setSelectedProcessId] = useState("")

  // Auto-generate routing name based on process flow
  const generateRoutingName = (steps: RoutingStep[]) => {
    if (steps.length === 0) return ""
    return steps
      .sort((a, b) => a.sequence - b.sequence)
      .map((step) => step.processName)
      .join(" - ")
  }

  React.useEffect(() => {
    if (routing) {
      setFormData({
        name: routing.name,
        description: routing.description,
        category: routing.category,
        categoryId: "", // TODO: Need to get categoryId from routing
        estimatedLeadTime: routing.estimatedLeadTime,
        active: routing.active,
        steps: [...routing.steps],
        materialMarkup: routing.materialMarkup,
        finishingCost: routing.finishingCost,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        category: "",
        categoryId: "",
        estimatedLeadTime: 5,
        active: true,
        steps: [],
        materialMarkup: 35,
        finishingCost: 0,
      })
    }
  }, [routing])

  // Update routing name whenever steps change
  React.useEffect(() => {
    const autoGeneratedName = generateRoutingName(formData.steps)
    if (autoGeneratedName && (!routing || formData.name === generateRoutingName(routing.steps))) {
      setFormData((prev) => ({ ...prev, name: autoGeneratedName }))
    }
  }, [formData.steps, routing])

  const addStep = () => {
    if (!selectedProcessId) return

    const process = processes.find((p) => p.id === selectedProcessId)
    if (!process) return

const newStep: RoutingStep = {
  id: Date.now().toString(),
  processId: process.id,
  processName: process.name,
  sequence: formData.steps.length + 1,
  setupTimeMultiplier: 1.0,
  runtimeMultiplier: 1.0,
  notes: "",
  setupTime: process.setup_time ?? process.setupTime,
  hourlyRate: process.hourly_rate ?? process.hourlyRate,
  minimumCost: process.minimum_cost ?? process.minimumCost,
  complexityMultiplier: process.complexity_multiplier ?? process.complexityMultiplier,
    }

    const updatedSteps = [...formData.steps, newStep]
    setFormData({
      ...formData,
      steps: updatedSteps,
    })
    setSelectedProcessId("")
  }

  const removeStep = (stepId: string) => {
    const updatedSteps = formData.steps
      .filter((s) => s.id !== stepId)
      .map((step, index) => ({ ...step, sequence: index + 1 }))

    setFormData({
      ...formData,
      steps: updatedSteps,
    })
  }

  const updateStep = (stepId: string, field: keyof RoutingStep, value: any) => {
    setFormData({
      ...formData,
      steps: formData.steps.map((step) => (step.id === stepId ? { ...step, [field]: value } : step)),
    })
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(formData.steps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update sequence numbers
    const updatedSteps = items.map((step, index) => ({ ...step, sequence: index + 1 }))

    setFormData({
      ...formData,
      steps: updatedSteps,
    })
  }

  const calculateEstimatedCost = () => {
    let totalSetupCost = 0
    let totalRuntimeCost = 0
    let totalMinimumCost = 0

    formData.steps.forEach((step) => {
      const setupCost = ((step.setupTime * step.setupTimeMultiplier) / 60) * step.hourlyRate
      const runtimeCost = ((30 * step.runtimeMultiplier) / 60) * step.hourlyRate * step.complexityMultiplier

      totalSetupCost += setupCost
      totalRuntimeCost += runtimeCost
      totalMinimumCost = Math.max(totalMinimumCost, step.minimumCost)
    })

    const processingCost = Math.max(totalSetupCost + totalRuntimeCost, totalMinimumCost)
    const materialCost = 100 * (1 + formData.materialMarkup / 100) // Assuming $100 material
    const finishingCost = formData.finishingCost * 100 // Assuming 100 sq in

    return {
      processingCost,
      materialCost,
      finishingCost,
      totalCost: processingCost + materialCost + finishingCost,
    }
  }

  const handleSave = () => {
    // Calculate total setup time from steps
    const totalSetupTime = formData.steps.reduce((total, step) => {
      return total + (step.setupTime * step.setupTimeMultiplier);
    }, 0);
    
    onSave({
      ...formData,
      totalSetupTime: Math.round(totalSetupTime)
    })
  }

  const costBreakdown = calculateEstimatedCost()

  return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-0 shadow-xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-slate-900">
          {routing ? "Edit Routing" : "Create Routing"}
        </DialogTitle>
        <DialogDescription className="text-slate-600">
          Build a pricing-driven workflow by adding and sequencing manufacturing processes
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-6 py-4">
        {/* Left Column - Configuration */}
        <div className="col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                Routing Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Auto-generated from process flow"
              />
              <p className="text-xs text-slate-500">
                Name is auto-generated from process sequence. You can override it manually.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-slate-700">
                Category
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  if (value === "__manage__") {
                    setIsCategoryManagerOpen(true);
                  } else {
                    const selectedCategory = routingCategories.find(cat => cat.id === value);
                    setFormData({ 
                      ...formData, 
                      categoryId: value,
                      category: selectedCategory?.name || ""
                    });
                  }
                }}
              >
                <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCategories ? (
                    <div className="px-4 py-2 text-xs text-slate-400">Loading...</div>
                  ) : categoryError ? (
                    <div className="px-4 py-2 text-xs text-red-500">{categoryError}</div>
                  ) : routingCategories.length === 0 ? (
                    <div className="px-4 py-2 text-xs text-slate-400">No categories found</div>
                  ) : (
                    routingCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                  <SelectItem value="__manage__">
                    <span className="text-blue-600">+ Manage Categories</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leadTime" className="text-sm font-medium text-slate-700">
                  Estimated Lead Time (days)
                </Label>
                <Input
                  id="leadTime"
                  type="number"
                  value={formData.estimatedLeadTime}
                  onChange={(e) => setFormData({ ...formData, estimatedLeadTime: Number(e.target.value) })}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing Configuration */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 space-y-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-blue-900">Routing Pricing Control</h4>
            </div>
            <p className="text-sm text-blue-700">
              These values become the defaults for this routing across all pricing tiers. Tiers can override these for
              specific cases.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="materialMarkup" className="text-sm font-medium text-slate-700">
                  Material Markup (%)
                </Label>
                <Input
                  id="materialMarkup"
                  type="number"
                  value={formData.materialMarkup}
                  onChange={(e) => setFormData({ ...formData, materialMarkup: Number(e.target.value) })}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">Applied to raw material costs</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finishingCost" className="text-sm font-medium text-slate-700">
                  Finishing Cost ($/sq in)
                </Label>
                <Input
                  id="finishingCost"
                  type="number"
                  step="0.01"
                  value={formData.finishingCost}
                  onChange={(e) => setFormData({ ...formData, finishingCost: Number(e.target.value) })}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">Cost per square inch of surface area</p>
              </div>
            </div>

            {/* Pricing Impact Preview */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h5 className="text-sm font-medium text-slate-700 mb-2">Pricing Impact Preview</h5>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-slate-600">Economy Tier</p>
                  <p className="font-bold text-green-600">${(costBreakdown.totalCost * 0.9).toFixed(0)}</p>
                  <p className="text-xs text-slate-500">0.9x multiplier</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600">Standard Tier</p>
                  <p className="font-bold text-blue-600">${costBreakdown.totalCost.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">1.0x multiplier</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600">Rush Tier</p>
                  <p className="font-bold text-red-600">${(costBreakdown.totalCost * 1.5).toFixed(0)}</p>
                  <p className="text-xs text-slate-500">1.5x multiplier</p>
                </div>
              </div>
            </div>
          </div>

          {/* Add Process Step */}
          <div className="border-t border-slate-200 pt-6">
            <Label className="text-sm font-medium text-slate-700 mb-3 block">Add Process Step</Label>
            <div className="flex gap-3">
              <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                <SelectTrigger className="flex-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select a process to add" />
                </SelectTrigger>
<SelectContent>
  {["Primary", "Secondary", "Finishing"].map(catName => (
    <React.Fragment key={catName}>
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
        {catName} Operations
      </div>
      {processes
        .filter(proc => proc.category_id === {
          Primary: "ce5e8735-8212-4bde-96b1-792a36f2e67c",
          Secondary: "6b1400d2-127a-483e-8f21-d87f98dc5514",
          Finishing: "21ac8f90-1ebe-4dc4-884e-ce395689fe64"
        }[catName])
        .map(proc => (
          <SelectItem key={proc.id} value={proc.id} className="pl-4">
            {proc.name}
          </SelectItem>
        ))}
    </React.Fragment>
  ))}
</SelectContent>
              </Select>
              <Button onClick={addStep} disabled={!selectedProcessId} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </div>

          {/* Process Steps */}
          {formData.steps.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-slate-700">Process Sequence</Label>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {formData.steps.map((step, index) => (
                        <Draggable key={step.id} draggableId={step.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                            >
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="h-5 w-5 text-slate-400" />
                                </div>
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600">{step.sequence}</span>
                                </div>
                                <div className="flex-1 grid grid-cols-4 gap-3">
                                  <div>
                                    <Label className="text-xs text-slate-600">Process</Label>
                                    <p className="font-medium text-slate-900">{step.processName}</p>
                                    <p className="text-xs text-slate-500">${step.hourlyRate}/hr</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Setup Multiplier</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={step.setupTimeMultiplier}
                                      onChange={(e) =>
                                        updateStep(step.id, "setupTimeMultiplier", Number(e.target.value))
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Runtime Multiplier</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={step.runtimeMultiplier}
                                      onChange={(e) =>
                                        updateStep(step.id, "runtimeMultiplier", Number(e.target.value))
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeStep(step.id)}
                                      className="hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 ml-12">
                                <Label className="text-xs text-slate-600">Notes</Label>
                                <Input
                                  value={step.notes || ""}
                                  onChange={(e) => updateStep(step.id, "notes", e.target.value)}
                                  placeholder="Optional notes for this step..."
                                  className="h-8 text-sm mt-1"
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>

        {/* Right Column - Cost Preview */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cost Preview
              </CardTitle>
              <CardDescription className="text-blue-700">
                Estimated cost for 1 unit with $100 material
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Processing:</span>
                <span className="font-medium">${costBreakdown.processingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Material:</span>
                <span className="font-medium">${costBreakdown.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Finishing:</span>
                <span className="font-medium">${costBreakdown.finishingCost.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-slate-900">Total:</span>
                <span className="text-blue-600">${costBreakdown.totalCost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {formData.steps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">Process Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-slate-700">{step.processName}</span>
                    <span className="text-slate-500">${step.hourlyRate}/hr</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          {routing ? "Save Changes" : "Create Routing"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}