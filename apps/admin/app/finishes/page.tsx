"use client"

import React, { useEffect, useState } from "react"
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
import { groupData } from "@/lib/table-utils"
import { Switch } from "@/components/ui/switch"
import { getTableColumnClasses } from "@/lib/table-utils"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVExportDialog } from "@/components/csv-export-dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useFinishesState } from "@/hooks/useFinishesState"
import { VALID_FINISH_TYPES } from "@/utils/finishValidation"
import { toast } from "@/components/ui/use-toast"
import { CreateFinishData } from "@/types/finish"

export default function FinishesPage() {
  const {
    items: finishes,
    ui,
    form,
    filters,
    stats,
    actions
  } = useFinishesState();

  // Add state for import/export dialogs
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Field mappings for CSV import/export
  const finishFieldMappings = {
    name: { 
      label: "Finish Name", 
      required: true, 
      type: "string" 
    },
    type: {
      label: "Type",
      required: true,
      type: "select",
      options: VALID_FINISH_TYPES
    },
    costPerSqIn: { 
      label: "Cost per sq in", 
      required: true, 
      type: "number" 
    },
    leadTimeDays: { 
      label: "Lead Time (days)", 
      required: true, 
      type: "number" 
    },
    description: { 
      label: "Description", 
      required: false, 
      type: "string" 
    },
    active: { 
      label: "Active", 
      required: false, 
      type: "boolean" 
    }
  };

  // Fetch finishes on mount
  useEffect(() => {
    actions.fetchFinishes();
  }, [actions.fetchFinishes]);

  // Handle CSV import
  const handleImport = async (importedData: any[]) => {
    try {
      // Transform imported data to match CreateFinishData type
      const finishesToImport: CreateFinishData[] = importedData.map(item => ({
        name: item.name,
        type: item.type,
        costPerSqIn: parseFloat(item.costPerSqIn),
        leadTimeDays: parseInt(item.leadTimeDays),
        description: item.description || '',
        active: item.active !== undefined ? item.active : true
      }));
      
      // Use the new batch import action
      const success = await actions.importFinishes(finishesToImport);
      
      if (success) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${importedData.length} finishes.`,
          variant: "default"
        });
        setIsImportDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import finishes",
        variant: "destructive"
      });
    }
  };

  // Group finishes if groupBy is set
  const groupedFinishes = filters.groupBy ? groupData(finishes, filters.groupBy) : null;

  // Table column classes
  const columnClasses = getTableColumnClasses().finishes;

  const renderFinishRow = (finish: any) => (
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
          <Switch 
            checked={finish.active} 
            onCheckedChange={() => actions.updateFormField('active', !finish.active)} 
          />
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
            onClick={() => actions.openDialog(finish)}
            className="hover:bg-blue-50 hover:text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-red-50 hover:text-red-600"
            onClick={() => actions.deleteFinishItem(finish.id)}
            disabled={ui.isSubmitting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderTable = (finishesToRender: any[], showHeader = true, isGrouped = false) => (
    <Table>
      <TableHeader className={isGrouped ? "border-b-0" : ""}>
        <TableRow className="hover:bg-transparent border-slate-200">
          <SortableTableHeader
            sortKey="name"
            currentSort={filters.sortConfig}
            onSort={actions.updateSort}
            className={columnClasses.name}
          >
            Finish Name
          </SortableTableHeader>
          <SortableTableHeader
            sortKey="type"
            currentSort={filters.sortConfig}
            onSort={actions.updateSort}
            className={columnClasses.type}
          >
            Type
          </SortableTableHeader>
          <SortableTableHeader
            sortKey="costPerSqIn"
            currentSort={filters.sortConfig}
            onSort={actions.updateSort}
            className={columnClasses.cost}
          >
            Cost per in²
          </SortableTableHeader>
          <SortableTableHeader
            sortKey="leadTimeDays"
            currentSort={filters.sortConfig}
            onSort={actions.updateSort}
            className={columnClasses.leadTime}
          >
            Lead Time
          </SortableTableHeader>
          <TableHead className={columnClasses.description}>Description</TableHead>
          <SortableTableHeader
            sortKey="active"
            currentSort={filters.sortConfig}
            onSort={actions.updateSort}
            className={columnClasses.status}
          >
            Status
          </SortableTableHeader>
          <TableHead className={columnClasses.actions}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{finishesToRender.map(renderFinishRow)}</TableBody>
    </Table>
  );

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
                  onClick={() => actions.openDialog()}
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
                  <p className="text-xl font-bold text-slate-900">{stats.total}</p>
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
                  <p className="text-xl font-bold text-slate-900">{stats.active}</p>
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
                  <p className="text-xl font-bold text-slate-900">{stats.types}</p>
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
                  <p className="text-xl font-bold text-slate-900">{stats.avgLeadTime} days</p>
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
                  value={filters.searchTerm}
                  onChange={(e) => actions.updateSearchTerm(e.target.value)}
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
              groupOptions={[
                { value: "active", label: "Status" },
                { value: "type", label: "Type" },
              ]}
              currentGroup={filters.groupBy}
              onGroupChange={actions.updateGroupBy}
              onClearGroup={() => actions.updateGroupBy("")}
            />

            {groupedFinishes ? (
              <div>
                {Object.entries(groupedFinishes).map(([groupValue, groupFinishes]) => (
                  <GroupedTableSection
                    key={groupValue}
                    groupKey={filters.groupBy}
                    groupValue={groupValue}
                    itemCount={groupFinishes.length}
                  >
                    {renderTable(groupFinishes, true, true)}
                  </GroupedTableSection>
                ))}
              </div>
            ) : (
              renderTable(finishes)
            )}

            {ui.isLoading && <div className="text-center text-slate-500 mt-8">Loading finishes...</div>}
            {ui.error && <div className="text-center text-red-600 mt-4">{ui.error}</div>}
          </CardContent>
        </Card>

        {/* Main Form Dialog */}
        <Dialog open={ui.isDialogOpen} onOpenChange={actions.closeDialog}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {form.editingId ? "Edit Finish" : "Add Finish"}
              </DialogTitle>
              <DialogDescription className="text-slate-600">Configure finish properties and pricing</DialogDescription>
            </DialogHeader>
            <form className="grid gap-6 py-4" onSubmit={(e) => { e.preventDefault(); actions.submitForm(); }}>
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Finish Name
                </Label>
                <Input
                  id="name"
                  value={form.data.name}
                  onChange={(e) => actions.updateFormField('name', e.target.value)}
                  className={`border-slate-300 focus:border-blue-500 focus:ring-blue-500 ${
                    form.errors.name ? 'border-red-500' : ''
                  }`}
                  required
                />
                {form.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.errors.name}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-sm font-medium text-slate-700">
                  Type
                </Label>
                <Select 
                  value={form.data.type} 
                  onValueChange={(value) => actions.updateFormField('type', value)}
                >
                  <SelectTrigger className={`border-slate-300 focus:border-blue-500 focus:ring-blue-500 ${
                    form.errors.type ? 'border-red-500' : ''
                  }`}>
                    <SelectValue placeholder="Select finish type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_FINISH_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.errors.type && (
                  <p className="text-sm text-red-500 mt-1">{form.errors.type}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="costPerSqIn" className="text-sm font-medium text-slate-700">
                    Cost per in²
                  </Label>
                  <Input
                    id="costPerSqIn"
                    type="number"
                    step="0.001"
                    value={form.data.costPerSqIn}
                    onChange={(e) => actions.updateFormField('costPerSqIn', e.target.value)}
                    className={`border-slate-300 focus:border-blue-500 focus:ring-blue-500 ${
                      form.errors.costPerSqIn ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {form.errors.costPerSqIn && (
                    <p className="text-sm text-red-500 mt-1">{form.errors.costPerSqIn}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="leadTimeDays" className="text-sm font-medium text-slate-700">
                    Lead Time (days)
                  </Label>
                  <Input
                    id="leadTimeDays"
                    type="number"
                    value={form.data.leadTimeDays}
                    onChange={(e) => actions.updateFormField('leadTimeDays', e.target.value)}
                    className={`border-slate-300 focus:border-blue-500 focus:ring-blue-500 ${
                      form.errors.leadTimeDays ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {form.errors.leadTimeDays && (
                    <p className="text-sm text-red-500 mt-1">{form.errors.leadTimeDays}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Input
                  id="description"
                  value={form.data.description}
                  onChange={(e) => actions.updateFormField('description', e.target.value)}
                  className={`border-slate-300 focus:border-blue-500 focus:ring-blue-500 ${
                    form.errors.description ? 'border-red-500' : ''
                  }`}
                />
                {form.errors.description && (
                  <p className="text-sm text-red-500 mt-1">{form.errors.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="active" className="text-sm font-medium text-slate-700">
                  Active
                </Label>
                <Switch
                  id="active"
                  checked={form.data.active}
                  onCheckedChange={(checked) => actions.updateFormField('active', checked)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={actions.closeDialog} type="button">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700" 
                  disabled={ui.isSubmitting}
                >
                  {ui.isSubmitting ? "Saving..." : "Save Finish"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <CSVImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImport}
          entityType="finishes"
          fieldMappings={finishFieldMappings}
        />

        {/* CSV Export Dialog */}
        <CSVExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          data={finishes}
          entityType="finishes"
          fieldMappings={finishFieldMappings}
        />
      </div>
    </div>
  );
}