"use client"

import { DialogTitle } from "@/components/ui/dialog"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Save, Edit, Route, DollarSign, Settings, Search, Filter, Wrench, AlertCircle, GitBranch, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  usePricingConfig, 
  useUpdatePricingConfig, 
  useUpdateRoutingPricing,
  calculatePrice,
  getTierColor,
  getProcessesInRouting,
  getProcessesFromRouting,
  type PricingConfiguration,
  type RoutingPricing,
  type TierOverride
} from "@/lib/api/pricing-config"
import { useCreatePricingVersion, generateVersionNumber } from "@/lib/api/pricing-versions"
import { useProcesses } from "@/lib/api/processes"
import { getCategoriesFromRoutings, getCategoriesFromPricing, getCategoryInfo } from "@/lib/categories"

// Types are now imported from the API module

// Import routing data for integrated pricing
import { useRoutings } from "@/lib/api/routings"

export default function MarginsPage() {
  // API hooks
  const { data: config, isLoading, error } = usePricingConfig()
  const { data: processes, isLoading: processesLoading } = useProcesses()
  const { data: routings, isLoading: routingsLoading } = useRoutings()
  const updatePricingConfig = useUpdatePricingConfig()
  const updateRoutingPricing = useUpdateRoutingPricing()
  const createVersion = useCreatePricingVersion()

  // UI state
  const [editingRouting, setEditingRouting] = useState<RoutingPricing | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([])
  const [isProcessPricingOpen, setIsProcessPricingOpen] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<any>(null)
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false)
  const [versionData, setVersionData] = useState({
    description: "",
    changes: [""]
  })

  // Helper function to update global settings
  const updateGlobalSettings = async (updates: Partial<PricingConfiguration['globalSettings']>) => {
    if (!config) return
    
    try {
      await updatePricingConfig.mutateAsync({
        ...config,
        globalSettings: {
          ...config.globalSettings,
          ...updates
        }
      })
    } catch (error) {
      console.error('Failed to update global settings:', error)
    }
  }

  // Helper functions
  const getRoutingsByProcess = (processName: string) => {
    if (!routings) return []
    return routings.filter((routing) => 
      routing.steps.some(step => step.processName.toLowerCase().includes(processName.toLowerCase()))
    )
  }

  const getActualRouting = (routingId: string) => {
    return routings?.find(r => r.id === routingId)
  }

  // Derived data using centralized category management
  const categories = config?.routings ? getCategoriesFromPricing(config.routings) : []
  // Use real processes from the database and actual routing steps
  const allProcesses = processes ? processes.filter(p => p.active).map(p => p.name) : []
  const routingProcesses = routings ? 
    [...new Set(routings.flatMap(r => r.steps.map(s => s.processName)))]
    : []

  const handleSave = async () => {
    if (!config) return
    
    try {
      await updatePricingConfig.mutateAsync(config)
      console.log("Pricing configuration saved successfully")
    } catch (error) {
      console.error("Failed to save pricing configuration:", error)
    }
  }

  const updateRoutingOverride = async (
    routingId: string,
    tier: "economy" | "standard" | "rush",
    field: string,
    value: any,
  ) => {
    if (!config) return
    
    const routing = config.routings.find(r => r.routingId === routingId)
    if (!routing) return

    const updatedTierOverrides = {
      ...routing.tierOverrides,
      [tier]: {
        ...routing.tierOverrides[tier],
        [field]: value,
      },
    }

    try {
      await updateRoutingPricing.mutateAsync({
        routingId,
        data: { tierOverrides: updatedTierOverrides }
      })
    } catch (error) {
      console.error("Failed to update routing override:", error)
    }
  }

  const clearRoutingOverride = async (routingId: string, tier: "economy" | "standard" | "rush", field: string) => {
    if (!config) return
    
    const routing = config.routings.find(r => r.routingId === routingId)
    if (!routing) return

    const newOverrides = { ...routing.tierOverrides }
    if (newOverrides[tier]) {
      delete (newOverrides[tier] as any)[field]
      if (Object.keys(newOverrides[tier]).length === 0) {
        delete newOverrides[tier]
      }
    }

    try {
      await updateRoutingPricing.mutateAsync({
        routingId,
        data: { tierOverrides: newOverrides }
      })
    } catch (error) {
      console.error("Failed to clear routing override:", error)
    }
  }

  const handleCreateVersion = () => {
    setVersionData({
      description: "",
      changes: [""]
    })
    setIsVersionDialogOpen(true)
  }

  const handleSaveVersion = async () => {
    if (!versionData.description || versionData.changes.filter(c => c.trim()).length === 0) {
      return // Basic validation
    }

    try {
      await createVersion.mutateAsync({
        version: generateVersionNumber(),
        description: versionData.description,
        changes: versionData.changes.filter(c => c.trim())
      })
      setIsVersionDialogOpen(false)
      setVersionData({ description: "", changes: [""] })
      console.log("New pricing version created successfully")
    } catch (error) {
      console.error("Failed to create version:", error)
    }
  }

  const addVersionChangeField = () => {
    setVersionData(prev => ({ ...prev, changes: [...prev.changes, ""] }))
  }

  const updateVersionChangeField = (index: number, value: string) => {
    setVersionData(prev => ({
      ...prev,
      changes: prev.changes.map((change, i) => i === index ? value : change)
    }))
  }

  const removeVersionChangeField = (index: number) => {
    setVersionData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index || prev.changes.length === 1)
    }))
  }

  // Helper functions are now imported from the API module

  const updateProcessPricing = async (processName: string, newHourlyRate: number) => {
    console.log(`Updating ${processName} hourly rate to $${newHourlyRate}`)
    
    // Note: Process pricing updates should be done through the processes API
    // This will automatically trigger routing pricing synchronization via database triggers
    // For now, we'll show a message that this should be done through the processes module
    alert('Process pricing should be updated through the Processes module. Changes will automatically sync to routing pricing.')
  }

  const filteredRoutings = config?.routings?.filter((routing) => {
    // Search filter - check routing name, category, and actual processes
    let matchesSearch = true
    if (searchTerm && searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim()
      const actualRouting = getActualRouting(routing.routingId)
      
      // Check routing name from actual routing or fallback to routingId
      const routingNameMatch = (actualRouting?.name || routing.routingId).toLowerCase().includes(searchLower)
      const categoryMatch = routing.category.toLowerCase().includes(searchLower)
      
      // Get processes from actual routing steps
      const processes = actualRouting ? actualRouting.steps.map(s => s.processName) : []
      const processMatch = processes.some((process) =>
        process.toLowerCase().includes(searchLower)
      )
      
      matchesSearch = routingNameMatch || categoryMatch || processMatch
    }

    // Category filter
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(routing.category)

    // Process filter - check actual routing processes
    const matchesProcess = selectedProcesses.length === 0 || 
      selectedProcesses.some((process) => {
        const actualRouting = getActualRouting(routing.routingId)
        const routingProcesses = actualRouting ? actualRouting.steps.map(s => s.processName) : []
        return routingProcesses.some(p => 
          p.toLowerCase().includes(process.toLowerCase()) ||
          process.toLowerCase().includes(p.toLowerCase())
        )
      })

    return matchesSearch && matchesCategory && matchesProcess
  }) || []

  // Loading state
  if (isLoading || processesLoading || routingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-96 mb-4" />
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
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              Failed to load pricing configuration: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!config) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl p-2 shadow-sm" />
            <div className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900">Routing-Based Pricing</h1>
                  {config.status === 'draft' && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">
                      Draft Version
                    </Badge>
                  )}
                  {config.status === 'published' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                      Published
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-slate-600">
                  Configure pricing multipliers and overrides for each routing
                  {config.status === 'draft' && (
                    <span className="text-orange-600 ml-2">• Working on draft configuration</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCreateVersion}
                  variant="outline"
                  className="h-10 px-4 border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Create Version
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updatePricingConfig.isPending}
                  className="h-10 px-4 bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe] shadow-lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatePricingConfig.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Route className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Routings</p>
                  <p className="text-xl font-bold text-slate-900">{config.routings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Route className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Unique Categories</p>
                  <p className="text-xl font-bold text-slate-900">{categories.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Custom Overrides</p>
                  <p className="text-xl font-bold text-slate-900">
                    {config.routings.reduce((sum, r) => sum + Object.keys(r.tierOverrides).length, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Min Order</p>
                  <p className="text-xl font-bold text-slate-900">${config.globalSettings.minimumOrderValue}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Global Tier Multipliers */}
          <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
              {/* Search and Filters */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search routings or processes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedCategories([])
                      setSelectedProcesses([])
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-3">
                  {/* Category Filters */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Categories:</span>
                    {categories.map((category) => (
                      <label key={category} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, category])
                            } else {
                              setSelectedCategories(selectedCategories.filter((c) => c !== category))
                            }
                          }}
                          className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                        />
                        <span className="text-sm text-slate-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Process Filters */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-slate-600 mr-2">Processes:</span>
                  {allProcesses.slice(0, 8).map((process) => {
                    // Count actual routings that use this process
                    const routingCount = routings?.filter(routing => 
                      routing.steps.some(step => 
                        step.processName.toLowerCase().includes(process.toLowerCase())
                      )
                    ).length || 0
                    const isSelected = selectedProcesses.includes(process)
                    return (
                      <Button
                        key={process}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${isSelected ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProcesses(selectedProcesses.filter((p) => p !== process))
                          } else {
                            setSelectedProcesses([...selectedProcesses, process])
                          }
                        }}
                      >
                        {process} ({routingCount})
                      </Button>
                    )
                  })}
                  {allProcesses.length > 8 && (
                    <span className="text-xs text-slate-500 self-center">+{allProcesses.length - 8} more</span>
                  )}
                </div>

                {/* Active Filters Summary */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">
                      Showing {filteredRoutings.length} of {config.routings.length} routings
                    </span>
                    {searchTerm && <span>• Search: "{searchTerm}"</span>}
                    {selectedCategories.length > 0 && <span>• Categories: {selectedCategories.join(", ")}</span>}
                    {selectedProcesses.length > 0 && <span>• Processes: {selectedProcesses.join(", ")}</span>}
                  </div>
                  {/* Debug info - remove after testing */}
                  <div className="text-xs text-blue-600 mt-1">
                    <div>Database processes ({allProcesses.length}): {allProcesses.join(", ")}</div>
                    {routings && routings.length > 0 && (
                      <div>Routing processes ({routingProcesses.length}): {routingProcesses.join(", ")}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-700">Economy Tier Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.globalSettings.defaultTierMultipliers.economy}
                    onChange={(e) => {
                      updateGlobalSettings({
                        defaultTierMultipliers: {
                          ...config.globalSettings.defaultTierMultipliers,
                          economy: parseFloat(e.target.value) || 0.9
                        }
                      })
                    }}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                  />
                  <p className="text-xs text-green-600">Competitive pricing for longer lead times</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700">Standard Tier Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.globalSettings.defaultTierMultipliers.standard}
                    onChange={(e) => {
                      updateGlobalSettings({
                        defaultTierMultipliers: {
                          ...config.globalSettings.defaultTierMultipliers,
                          standard: parseFloat(e.target.value) || 1.0
                        }
                      })
                    }}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                  />
                  <p className="text-xs text-blue-600">Baseline pricing for normal delivery</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-700">Rush Tier Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.globalSettings.defaultTierMultipliers.rush}
                    onChange={(e) => {
                      updateGlobalSettings({
                        defaultTierMultipliers: {
                          ...config.globalSettings.defaultTierMultipliers,
                          rush: parseFloat(e.target.value) || 1.5
                        }
                      })
                    }}
                    className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                  />
                  <p className="text-xs text-red-600">Premium pricing for expedited delivery</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Routing-Specific Pricing */}
          <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-xl flex items-center justify-center">
                  <Route className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900">Routing Pricing Configuration</CardTitle>
                  <CardDescription className="text-slate-600 mt-1">
                    Configure tier-specific overrides for each routing workflow
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {filteredRoutings.map((routing) => {
                  const actualRouting = getActualRouting(routing.routingId)
                  return (
                    <div
                    key={routing.routingId}
                    className="bg-gradient-to-br from-slate-50/50 to-white border border-slate-200 rounded-2xl p-6"
                  >
                    {/* Routing Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {actualRouting?.name || routing.routingId}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {routing.category} • Base Cost: ${routing.baseCost} • {routing.materialMarkup}% markup •{" "}
                            {routing.leadTime} days
                            {actualRouting && (
                              <span className="ml-2 text-blue-600">
                                • {actualRouting.steps.length} steps • {actualRouting.totalSetupTime}min setup
                              </span>
                            )}
                          </p>
                          {actualRouting && (
                            <p className="text-xs text-slate-500 mt-1">
                              Steps: {actualRouting.steps.map(s => s.processName).join(' → ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (actualRouting && actualRouting.steps.length === 1) {
                            const step = actualRouting.steps[0]
                            const process = processes?.find(p => p.id === step.processId)
                            if (process) {
                              setSelectedProcess({
                                id: process.id,
                                name: process.name,
                                category: process.category,
                                hourlyRate: step.hourlyRate,
                                setupTime: step.setupTime
                              })
                              setIsProcessPricingOpen(true)
                            }
                          }
                        }}
                        className="hover:bg-purple-50 hover:text-purple-600"
                        disabled={!actualRouting || actualRouting.steps.length > 1}
                        title={
                          !actualRouting 
                            ? "Routing not found in system"
                            : actualRouting.steps.length > 1
                            ? "Multi-process routings require individual process updates"
                            : "Update base process pricing"
                        }
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Update Process
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                        onClick={() => {
                          setEditingRouting(routing)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>

                    {/* Tier Pricing Grid */}
                    <div className="grid grid-cols-3 gap-6">
                      {(["economy", "standard", "rush"] as const).map((tier) => {
                        const pricing = calculatePrice(routing, tier, config.globalSettings.defaultTierMultipliers, config.globalSettings.volumeBreaks, 10)
                        const hasOverrides =
                          routing.tierOverrides[tier] && Object.keys(routing.tierOverrides[tier]).length > 0

                        return (
                          <div
                            key={tier}
                            className={`border-2 rounded-xl p-4 ${getTierColor(tier)} ${
                              hasOverrides ? "ring-2 ring-offset-2 ring-blue-200" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold capitalize">{tier}</h4>
                              {hasOverrides && (
                                <Badge variant="secondary" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Multiplier:</span>
                                <span className="font-medium">
                                  {pricing.effectiveMultiplier}x
                                  {routing.tierOverrides[tier]?.multiplier && (
                                    <span className="text-blue-600 ml-1">*</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Material Markup:</span>
                                <span className="font-medium">
                                  {pricing.effectiveMaterialMarkup}%
                                  {routing.tierOverrides[tier]?.materialMarkupOverride && (
                                    <span className="text-blue-600 ml-1">*</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Finishing:</span>
                                <span className="font-medium">
                                  ${pricing.effectiveFinishingCost}/sq in
                                  {routing.tierOverrides[tier]?.finishingCostOverride && (
                                    <span className="text-blue-600 ml-1">*</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Lead Time:</span>
                                <span className="font-medium">
                                  {routing.tierOverrides[tier]?.leadTimeOverride || routing.leadTime} days
                                  {routing.tierOverrides[tier]?.leadTimeOverride && (
                                    <span className="text-blue-600 ml-1">*</span>
                                  )}
                                </span>
                              </div>
                              <Separator className="my-2" />
                              <div className="flex justify-between font-bold">
                                <span>Total (qty 10):</span>
                                <span>${pricing.finalPrice.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between text-xs opacity-75">
                                <span>Per unit:</span>
                                <span>${(pricing.finalPrice / 10).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Override Indicators */}
                    {Object.keys(routing.tierOverrides).length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Custom overrides active:</span>{" "}
                          {Object.entries(routing.tierOverrides)
                            .map(([tier, overrides]) => `${tier} (${Object.keys(overrides).length} overrides)`)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>

          {/* Global Settings */}
          <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900">Global Settings</CardTitle>
                  <CardDescription className="text-slate-600 mt-1">
                    Settings applied across all routings and tiers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-md space-y-2">
                <Label htmlFor="minimumOrder" className="text-sm font-medium text-slate-700">
                  Minimum Order Value ($)
                </Label>
                <Input
                  id="minimumOrder"
                  type="number"
                  value={config.globalSettings.minimumOrderValue}
                  onChange={(e) => {
                    updateGlobalSettings({
                      minimumOrderValue: parseFloat(e.target.value) || 0
                    })
                  }}
                  className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
                <p className="text-xs text-slate-500">Minimum total for any quote regardless of routing or tier</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routing Configuration Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Tier Overrides: {editingRouting?.routingName}</DialogTitle>
              <DialogDescription>
                Set custom values for specific tiers. Leave blank to use routing defaults or global multipliers.
              </DialogDescription>
            </DialogHeader>

            {editingRouting && (
              <div className="space-y-6 py-4">
                {/* Routing Defaults */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">Routing Defaults</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Base Cost:</span>
                      <p className="font-medium">${editingRouting.baseCost}</p>
                    </div>

                    <div>
                      <span className="text-slate-600">Material Markup:</span>
                      <p className="font-medium">{editingRouting.materialMarkup}%</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Finishing Cost:</span>
                      <p className="font-medium">${editingRouting.finishingCost}/sq in</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Lead Time:</span>
                      <p className="font-medium">{editingRouting.leadTime} days</p>
                    </div>
                  </div>
                </div>

                {/* Tier Overrides */}
                <div className="grid grid-cols-3 gap-6">
                  {(["economy", "standard", "rush"] as const).map((tier) => (
                    <div key={tier} className={`border-2 rounded-xl p-4 ${getTierColor(tier)}`}>
                      <h4 className="font-semibold capitalize mb-4">{tier} Tier Overrides</h4>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs">Custom Multiplier</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder={`Default: ${config.globalSettings.defaultTierMultipliers[tier]}x`}
                            value={editingRouting.tierOverrides[tier]?.multiplier || ""}
                            onChange={(e) =>
                              updateRoutingOverride(
                                editingRouting.routingId,
                                tier,
                                "multiplier",
                                e.target.value ? Number(e.target.value) : undefined,
                              )
                            }
                            className="h-8 text-sm border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Material Markup (%)</Label>
                          <Input
                            type="number"
                            placeholder={`Default: ${editingRouting.materialMarkup}%`}
                            value={editingRouting.tierOverrides[tier]?.materialMarkupOverride || ""}
                            onChange={(e) =>
                              updateRoutingOverride(
                                editingRouting.routingId,
                                tier,
                                "materialMarkupOverride",
                                e.target.value ? Number(e.target.value) : undefined,
                              )
                            }
                            className="h-8 text-sm border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Finishing Cost ($/sq in)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={`Default: $${editingRouting.finishingCost}`}
                            value={editingRouting.tierOverrides[tier]?.finishingCostOverride || ""}
                            onChange={(e) =>
                              updateRoutingOverride(
                                editingRouting.routingId,
                                tier,
                                "finishingCostOverride",
                                e.target.value ? Number(e.target.value) : undefined,
                              )
                            }
                            className="h-8 text-sm border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Lead Time (days)</Label>
                          <Input
                            type="number"
                            placeholder={`Default: ${editingRouting.leadTime} days`}
                            value={editingRouting.tierOverrides[tier]?.leadTimeOverride || ""}
                            onChange={(e) =>
                              updateRoutingOverride(
                                editingRouting.routingId,
                                tier,
                                "leadTimeOverride",
                                e.target.value ? Number(e.target.value) : undefined,
                              )
                            }
                            className="h-8 text-sm border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Preview */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Live Pricing Preview (Quantity: 10)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {(["economy", "standard", "rush"] as const).map((tier) => {
                      const pricing = calculatePrice(editingRouting, tier, config.globalSettings.defaultTierMultipliers, config.globalSettings.volumeBreaks, 10)
                      return (
                        <div key={tier} className="text-center">
                          <p className="text-sm font-medium capitalize">{tier}</p>
                          <p className="text-lg font-bold">${pricing.finalPrice.toFixed(0)}</p>
                          <p className="text-xs text-slate-600">${(pricing.finalPrice / 10).toFixed(2)} per unit</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                onClick={() => setIsDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Process Pricing Update Dialog */}
        <Dialog open={isProcessPricingOpen} onOpenChange={setIsProcessPricingOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Update Process Pricing: {selectedProcess?.name}
              </DialogTitle>
              <DialogDescription>
                Updating this process will affect all routings that use it. Changes will recalculate base costs
                automatically.
              </DialogDescription>
            </DialogHeader>

            {selectedProcess && (
              <div className="space-y-6 py-4">
                {/* Current Process Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">Current Process Settings</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Category:</span>
                      <p className="font-medium">{selectedProcess.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Current Rate:</span>
                      <p className="font-medium">${selectedProcess.hourlyRate}/hr</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Setup Time:</span>
                      <p className="font-medium">{selectedProcess.setupTime} min</p>
                    </div>
                  </div>
                </div>

                {/* Update Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newRate" className="text-sm font-medium text-slate-700">
                      New Hourly Rate ($)
                    </Label>
                    <Input
                      id="newRate"
                      type="number"
                      defaultValue={selectedProcess.hourlyRate}
                      className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                    />
                  </div>
                </div>

                {/* Impact Preview */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-900 mb-2">Impact Analysis</h4>
                      <p className="text-sm text-orange-800 mb-3">
                        This process is used in {getRoutingsByProcess(selectedProcess.name).length} routing(s):
                      </p>
                      <div className="space-y-1">
                        {getRoutingsByProcess(selectedProcess.name).map((routing) => {
                          const pricingRouting = config?.routings.find(pr => pr.routingId === routing.id)
                          return (
                            <div key={routing.id} className="text-sm text-orange-700">
                            • {routing.name} (Current base cost: ${pricingRouting?.baseCost || 'N/A'})
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                onClick={() => setIsProcessPricingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const newRate = (document.getElementById("newRate") as HTMLInputElement)?.value
                  if (newRate && selectedProcess) {
                    updateProcessPricing(selectedProcess.name, Number(newRate))
                    setIsProcessPricingOpen(false)
                  }
                }}
                className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]"
              >
                Update Process Pricing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Version Dialog */}
        <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                Create New Pricing Version
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Create a new draft version to track these pricing changes
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="version-desc" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="version-desc"
                  value={versionData.description}
                  onChange={(e) => setVersionData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the changes in this version..."
                  rows={3}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-slate-700">
                  Changes
                </Label>
                {versionData.changes.map((change, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={change}
                      onChange={(e) => updateVersionChangeField(index, e.target.value)}
                      placeholder={`Change ${index + 1}...`}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {versionData.changes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeVersionChangeField(index)}
                        className="px-3"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVersionChangeField}
                  className="w-fit"
                >
                  Add Change
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVersionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveVersion}
                disabled={createVersion.isPending}
                className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]"
              >
                {createVersion.isPending ? "Creating..." : "Create Draft Version"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
