"use client"

import React from "react"

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

const mockProcesses = [
  // Primary Operations
  {
    id: "1",
    name: "Laser Cutting",
    category: "Primary",
    setupTime: 15,
    hourlyRate: 95,
    minimumCost: 25,
    complexityMultiplier: 1.0,
  },
  {
    id: "2",
    name: "CNC Milling",
    category: "Primary",
    setupTime: 30,
    hourlyRate: 85,
    minimumCost: 50,
    complexityMultiplier: 1.2,
  },
  {
    id: "3",
    name: "CNC Turning",
    category: "Primary",
    setupTime: 20,
    hourlyRate: 75,
    minimumCost: 40,
    complexityMultiplier: 1.0,
  },
  {
    id: "4",
    name: "Press Brake Bending",
    category: "Primary",
    setupTime: 10,
    hourlyRate: 65,
    minimumCost: 30,
    complexityMultiplier: 0.8,
  },
  {
    id: "5",
    name: "Waterjet Cutting",
    category: "Primary",
    setupTime: 20,
    hourlyRate: 110,
    minimumCost: 35,
    complexityMultiplier: 1.1,
  },
  {
    id: "6",
    name: "Plasma Cutting",
    category: "Primary",
    setupTime: 12,
    hourlyRate: 70,
    minimumCost: 25,
    complexityMultiplier: 0.9,
  },

  // Secondary Operations
  {
    id: "7",
    name: "TIG Welding",
    category: "Secondary",
    setupTime: 25,
    hourlyRate: 90,
    minimumCost: 45,
    complexityMultiplier: 1.5,
  },
  {
    id: "8",
    name: "MIG Welding",
    category: "Secondary",
    setupTime: 20,
    hourlyRate: 80,
    minimumCost: 40,
    complexityMultiplier: 1.3,
  },
  {
    id: "9",
    name: "Deburring",
    category: "Secondary",
    setupTime: 5,
    hourlyRate: 45,
    minimumCost: 15,
    complexityMultiplier: 0.5,
  },
  {
    id: "10",
    name: "Tapping",
    category: "Secondary",
    setupTime: 8,
    hourlyRate: 55,
    minimumCost: 20,
    complexityMultiplier: 0.7,
  },
  {
    id: "11",
    name: "Assembly",
    category: "Secondary",
    setupTime: 15,
    hourlyRate: 60,
    minimumCost: 30,
    complexityMultiplier: 1.0,
  },
  {
    id: "12",
    name: "Heat Treatment",
    category: "Secondary",
    setupTime: 30,
    hourlyRate: 75,
    minimumCost: 50,
    complexityMultiplier: 1.2,
  },

  // Finishing Operations
  {
    id: "13",
    name: "Powder Coating",
    category: "Finishing",
    setupTime: 20,
    hourlyRate: 65,
    minimumCost: 35,
    complexityMultiplier: 1.0,
  },
  {
    id: "14",
    name: "Anodizing",
    category: "Finishing",
    setupTime: 25,
    hourlyRate: 70,
    minimumCost: 40,
    complexityMultiplier: 1.1,
  },
  {
    id: "15",
    name: "Plating",
    category: "Finishing",
    setupTime: 30,
    hourlyRate: 80,
    minimumCost: 45,
    complexityMultiplier: 1.2,
  },
  {
    id: "16",
    name: "Painting",
    category: "Finishing",
    setupTime: 15,
    hourlyRate: 55,
    minimumCost: 30,
    complexityMultiplier: 0.9,
  },
  {
    id: "17",
    name: "Passivation",
    category: "Finishing",
    setupTime: 10,
    hourlyRate: 60,
    minimumCost: 25,
    complexityMultiplier: 0.8,
  },
  {
    id: "18",
    name: "Polishing",
    category: "Finishing",
    setupTime: 20,
    hourlyRate: 65,
    minimumCost: 35,
    complexityMultiplier: 1.0,
  },
]

const mockRoutings: Routing[] = [
  {
    id: "1",
    name: "Laser Cutting - Deburring - Press Brake Bending - TIG Welding",
    description: "Standard sheet metal fabrication for brackets and enclosures",
    category: "Sheet Metal",
    steps: [
      {
        id: "s1",
        processId: "1",
        processName: "Laser Cutting",
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: "Cut to size with standard tolerances",
        setupTime: 15,
        hourlyRate: 95,
        minimumCost: 25,
        complexityMultiplier: 1.0,
      },
      {
        id: "s2",
        processId: "9",
        processName: "Deburring",
        sequence: 2,
        setupTimeMultiplier: 0.5,
        runtimeMultiplier: 0.8,
        notes: "Remove sharp edges",
        setupTime: 5,
        hourlyRate: 45,
        minimumCost: 15,
        complexityMultiplier: 0.5,
      },
      {
        id: "s3",
        processId: "4",
        processName: "Press Brake Bending",
        sequence: 3,
        setupTimeMultiplier: 1.2,
        runtimeMultiplier: 1.0,
        notes: "Form bends per drawing",
        setupTime: 10,
        hourlyRate: 65,
        minimumCost: 30,
        complexityMultiplier: 0.8,
      },
      {
        id: "s4",
        processId: "7",
        processName: "TIG Welding",
        sequence: 4,
        setupTimeMultiplier: 1.5,
        runtimeMultiplier: 1.3,
        notes: "Weld joints as specified",
        setupTime: 25,
        hourlyRate: 90,
        minimumCost: 45,
        complexityMultiplier: 1.5,
      },
    ],
    totalSetupTime: 120,
    estimatedLeadTime: 5,
    active: true,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20",
    materialMarkup: 35,
    finishingCost: 0.15,
    isPrimaryPricingRoute: true,
  },
  {
    id: "2",
    name: "CNC Milling - Deburring - Anodizing",
    description: "CNC machined housing with finishing",
    category: "Machining",
    steps: [
      {
        id: "s5",
        processId: "2",
        processName: "CNC Milling",
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: "Rough and finish machining",
        setupTime: 30,
        hourlyRate: 85,
        minimumCost: 50,
        complexityMultiplier: 1.2,
      },
      {
        id: "s6",
        processId: "9",
        processName: "Deburring",
        sequence: 2,
        setupTimeMultiplier: 0.3,
        runtimeMultiplier: 0.5,
        notes: "Hand deburr all edges",
        setupTime: 5,
        hourlyRate: 45,
        minimumCost: 15,
        complexityMultiplier: 0.5,
      },
      {
        id: "s7",
        processId: "14",
        processName: "Anodizing",
        sequence: 3,
        setupTimeMultiplier: 0.8,
        runtimeMultiplier: 1.0,
        notes: "Clear anodize finish",
        setupTime: 25,
        hourlyRate: 70,
        minimumCost: 40,
        complexityMultiplier: 1.1,
      },
    ],
    totalSetupTime: 90,
    estimatedLeadTime: 7,
    active: true,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-18",
    materialMarkup: 40,
    finishingCost: 0.25,
    isPrimaryPricingRoute: false,
  },
  {
    id: "3",
    name: "Laser Cutting - MIG Welding - Powder Coating",
    description: "Multi-component welded assembly",
    category: "Weldments",
    steps: [
      {
        id: "s8",
        processId: "1",
        processName: "Laser Cutting",
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: "Cut all components",
        setupTime: 15,
        hourlyRate: 95,
        minimumCost: 25,
        complexityMultiplier: 1.0,
      },
      {
        id: "s9",
        processId: "8",
        processName: "MIG Welding",
        sequence: 2,
        setupTimeMultiplier: 2.0,
        runtimeMultiplier: 1.8,
        notes: "Tack and final weld",
        setupTime: 20,
        hourlyRate: 80,
        minimumCost: 40,
        complexityMultiplier: 1.3,
      },
      {
        id: "s10",
        processId: "13",
        processName: "Powder Coating",
        sequence: 3,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: "Black powder coat finish",
        setupTime: 20,
        hourlyRate: 65,
        minimumCost: 35,
        complexityMultiplier: 1.0,
      },
    ],
    totalSetupTime: 180,
    estimatedLeadTime: 10,
    active: false,
    createdAt: "2024-01-05",
    updatedAt: "2024-01-12",
    materialMarkup: 30,
    finishingCost: 0.2,
    isPrimaryPricingRoute: false,
  },
  // Single operation routings
  {
    id: "4",
    name: "CNC Milling",
    description: "Simple CNC machining operation",
    category: "Machining",
    steps: [
      {
        id: "s11",
        processId: "2",
        processName: "CNC Milling",
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: "Standard milling operation",
        setupTime: 30,
        hourlyRate: 85,
        minimumCost: 50,
        complexityMultiplier: 1.2,
      },
    ],
    totalSetupTime: 30,
    estimatedLeadTime: 3,
    active: true,
    createdAt: "2024-01-22",
    updatedAt: "2024-01-22",
    materialMarkup: 35,
    finishingCost: 0,
    isPrimaryPricingRoute: false,
  },
  {
    id: "5",
    name: "Laser Cutting",
    description: "Simple laser cutting operation",
    category: "Cutting",
    steps: [
      {
        id: "s12",
        processId: "1",
        processName: "Laser Cutting",
        sequence: 1,
        setupTimeMultiplier: 1.0,
        runtimeMultiplier: 1.0,
        notes: "Standard laser cutting",
        setupTime: 15,
        hourlyRate: 95,
        minimumCost: 25,
        complexityMultiplier: 1.0,
      },
    ],
    totalSetupTime: 15,
    estimatedLeadTime: 2,
    active: true,
    createdAt: "2024-01-22",
    updatedAt: "2024-01-22",
    materialMarkup: 30,
    finishingCost: 0,
    isPrimaryPricingRoute: false,
  },
]

export default function RoutingsPage() {
  const [routings, setRoutings] = useState<Routing[]>(mockRoutings)
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

  const filteredRoutings = routings.filter(
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

        <RoutingDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          routing={editingRouting}
          processes={mockProcesses}
          onSave={(routingData) => {
            if (editingRouting) {
              setRoutings(routings.map((r) => (r.id === editingRouting.id ? { ...r, ...routingData } : r)))
            } else {
              const newRouting: Routing = {
                id: Date.now().toString(),
                ...routingData,
                createdAt: new Date().toISOString().split("T")[0],
                updatedAt: new Date().toISOString().split("T")[0],
                isPrimaryPricingRoute: false,
              }
              setRoutings([...routings, newRouting])
            }
            setIsDialogOpen(false)
          }}
        />
      </div>
    </div>
  )
}

interface RoutingDialogProps {
  isOpen: boolean
  onClose: () => void
  routing: Routing | null
  processes: Array<{
    id: string
    name: string
    category: string
    setupTime: number
    hourlyRate: number
    minimumCost: number
    complexityMultiplier: number
  }>
  onSave: (routing: Partial<Routing>) => void
}

function RoutingDialog({ isOpen, onClose, routing, processes, onSave }: RoutingDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
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
      setupTime: process.setupTime,
      hourlyRate: process.hourlyRate,
      minimumCost: process.minimumCost,
      complexityMultiplier: process.complexityMultiplier,
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
    onSave(formData)
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
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sheet Metal">Sheet Metal</SelectItem>
                    <SelectItem value="Machining">Machining</SelectItem>
                    <SelectItem value="Weldments">Weldments</SelectItem>
                    <SelectItem value="Assembly">Assembly</SelectItem>
                    <SelectItem value="Fabrication">Fabrication</SelectItem>
                    <SelectItem value="Cutting">Cutting</SelectItem>
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
                    {/* Primary Operations */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                      Primary Operations
                    </div>
                    {processes
                      .filter((process) => process.category === "Primary")
                      .map((process) => (
                        <SelectItem key={process.id} value={process.id} className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {process.name}
                          </div>
                        </SelectItem>
                      ))}

                    {/* Secondary Operations */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 mt-2">
                      Secondary Operations
                    </div>
                    {processes
                      .filter((process) => process.category === "Secondary")
                      .map((process) => (
                        <SelectItem key={process.id} value={process.id} className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            {process.name}
                          </div>
                        </SelectItem>
                      ))}

                    {/* Finishing Operations */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 mt-2">
                      Finishing Operations
                    </div>
                    {processes
                      .filter((process) => process.category === "Finishing")
                      .map((process) => (
                        <SelectItem key={process.id} value={process.id} className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {process.name}
                          </div>
                        </SelectItem>
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
  )
}
