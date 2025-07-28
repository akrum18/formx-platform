"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GitBranch, Eye, Play, Save, Clock, User, Search, Filter, AlertCircle, Trash2 } from "lucide-react"
import { SortableTableHeader } from "@/components/sortable-table-header"
import { TableControls } from "@/components/table-controls"
import { GroupedTableSection } from "@/components/grouped-table-section"
import { sortData, groupData, type SortConfig, getTableColumnClasses } from "@/lib/table-utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  usePricingVersions,
  useCreatePricingVersion,
  useUpdatePricingVersion,
  useDeletePricingVersion,
  usePublishPricingVersion,
  getStatusColor,
  formatDate,
  generateVersionNumber,
  type PricingVersion
} from "@/lib/api/pricing-versions"

// Types are now imported from the API module

export default function VersionsPage() {
  // API hooks
  const { data: versions = [], isLoading, error } = usePricingVersions()
  const createVersion = useCreatePricingVersion()
  const updateVersion = useUpdatePricingVersion()
  const deleteVersion = useDeletePricingVersion()
  const publishVersion = usePublishPricingVersion()

  // UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<PricingVersion | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "createdAt", direction: "desc" })
  const [groupBy, setGroupBy] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Form state for creating versions
  const [formData, setFormData] = useState({
    version: "",
    description: "",
    changes: [""]
  })

  const groupOptions = [
    { value: "status", label: "Status" },
    { value: "createdBy", label: "Created By" },
  ]

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleViewChanges = (version: PricingVersion) => {
    setSelectedVersion(version)
    setIsDialogOpen(true)
  }

  const handlePublish = async (id: string) => {
    try {
      await publishVersion.mutateAsync(id)
      console.log("Version published successfully")
    } catch (error) {
      console.error("Failed to publish version:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion.mutateAsync(id)
      console.log("Version deleted successfully")
    } catch (error) {
      console.error("Failed to delete version:", error)
    }
  }

  const handleCreateVersion = () => {
    setFormData({
      version: generateVersionNumber(),
      description: "",
      changes: [""]
    })
    setIsCreateDialogOpen(true)
  }

  const handleSaveVersion = async () => {
    if (!formData.version || !formData.description || formData.changes.filter(c => c.trim()).length === 0) {
      return // Basic validation
    }

    try {
      await createVersion.mutateAsync({
        version: formData.version,
        description: formData.description,
        changes: formData.changes.filter(c => c.trim())
      })
      setIsCreateDialogOpen(false)
      setFormData({ version: "", description: "", changes: [""] })
    } catch (error) {
      console.error("Failed to create version:", error)
    }
  }

  const addChangeField = () => {
    setFormData(prev => ({ ...prev, changes: [...prev.changes, ""] }))
  }

  const updateChangeField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((change, i) => i === index ? value : change)
    }))
  }

  const removeChangeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index || prev.changes.length === 1)
    }))
  }

  const filteredVersions = versions.filter(
    (version) =>
      version.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      version.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      version.createdBy.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedVersions = sortData(filteredVersions, sortConfig)
  const groupedVersions = groupData(sortedVersions, groupBy)

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
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              Failed to load pricing versions: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const renderVersionRow = (version: PricingVersion) => (
    <TableRow key={version.id} className="hover:bg-[#e8dcaa]/20 transition-colors">
      <TableCell className="font-medium text-slate-900">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-slate-400" />
          {version.version}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={getStatusColor(version.status)}>
          {version.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-slate-900">{version.createdBy}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-slate-900">{formatDate(version.createdAt)}</span>
        </div>
      </TableCell>
      <TableCell>{formatDate(version.publishedAt)}</TableCell>
      <TableCell className="max-w-xs truncate text-slate-600">{version.description}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewChanges(version)}
            className="hover:bg-blue-50 hover:text-blue-600"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {version.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePublish(version.id)}
                disabled={publishVersion.isPending}
                className="hover:bg-green-50 hover:text-green-600"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(version.id)}
                disabled={deleteVersion.isPending}
                className="hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )

  const renderTable = (versionsToRender: PricingVersion[], showHeader = true, isGrouped = false) => {
    const columnClasses = getTableColumnClasses().versions

    return (
      <Table>
        <TableHeader className={isGrouped ? "border-b-0" : ""}>
          <TableRow className="hover:bg-transparent border-slate-200">
            <SortableTableHeader
              sortKey="version"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.version}
            >
              Version
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="status"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.status}
            >
              Status
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="createdBy"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.createdBy}
            >
              Created By
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="createdAt"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.created}
            >
              Created
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="publishedAt"
              currentSort={sortConfig}
              onSort={handleSort}
              className={columnClasses.published}
            >
              Published
            </SortableTableHeader>
            <TableHead className={columnClasses.description}>Description</TableHead>
            <TableHead className={columnClasses.actions}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{versionsToRender.map(renderVersionRow)}</TableBody>
      </Table>
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
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">Pricing Versions</h1>
                <p className="text-lg text-slate-600">Manage draft and published pricing configurations</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCreateVersion}
                  className="h-10 px-4 bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe] shadow-lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Version
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Versions</p>
                  <p className="text-xl font-bold text-slate-900">{versions.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Published</p>
                  <p className="text-xl font-bold text-slate-900">
                    {versions.filter((v) => v.status === "published").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Draft</p>
                  <p className="text-xl font-bold text-slate-900">
                    {versions.filter((v) => v.status === "draft").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Archived</p>
                  <p className="text-xl font-bold text-slate-900">
                    {versions.filter((v) => v.status === "archived").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Version History</CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Track changes and manage pricing configuration versions
                </CardDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search versions..."
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
                {Object.entries(groupedVersions).map(([groupValue, groupVersions]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={groupBy}
                    groupValue={groupValue}
                    itemCount={groupVersions.length}
                  >
                    {renderTable(groupVersions, true, true)}
                  </GroupedTableSection>
                ))}
              </div>
            ) : (
              renderTable(sortedVersions, true, false)
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                Version {selectedVersion?.version} Changes
              </DialogTitle>
              <DialogDescription className="text-slate-600">{selectedVersion?.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h4 className="font-medium mb-3 text-slate-900">Changes in this version:</h4>
              <ul className="space-y-2">
                {selectedVersion?.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">Create New Version</DialogTitle>
              <DialogDescription className="text-slate-600">
                Create a new draft version of the pricing configuration
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="version" className="text-sm font-medium text-slate-700">
                  Version Number
                </Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="v2.3"
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the changes in this version..."
                  rows={3}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-slate-700">
                  Changes
                </Label>
                {formData.changes.map((change, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={change}
                      onChange={(e) => updateChangeField(index, e.target.value)}
                      placeholder={`Change ${index + 1}...`}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {formData.changes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeChangeField(index)}
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
                  onClick={addChangeField}
                  className="w-fit"
                >
                  Add Change
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
