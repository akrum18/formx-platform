import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Settings } from "lucide-react";
import { generateCSVExport, downloadCSV, ExportOptions } from "@/utils/csvHandling";

interface CSVExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  entityType: string;
  fieldMappings: Record<string, { label: string; required: boolean; type: string }>;
}

export function CSVExportDialog({ 
  isOpen, 
  onClose, 
  data, 
  entityType,
  fieldMappings 
}: CSVExportDialogProps) {
  const [fileName, setFileName] = useState(`${entityType.toLowerCase()}-export.csv`);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    Object.keys(fieldMappings).filter(key => fieldMappings[key].required)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(current => {
      if (current.includes(column)) {
        // Don't allow deselecting required columns
        if (fieldMappings[column].required) {
          return current;
        }
        return current.filter(c => c !== column);
      }
      return [...current, column];
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        includeInactive,
        selectedColumns,
        fileName
      };

      const csvContent = generateCSVExport(data, options);
      downloadCSV(csvContent, fileName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export {entityType}</DialogTitle>
          <DialogDescription>
            Configure your export settings and download the data as a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* File Name Input */}
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              className="w-full"
            />
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeInactive"
                checked={includeInactive}
                onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
              />
              <Label htmlFor="includeInactive">Include inactive items</Label>
            </div>

            {/* Column Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Columns to Export</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(fieldMappings).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${key}`}
                      checked={selectedColumns.includes(key)}
                      onCheckedChange={() => handleColumnToggle(key)}
                      disabled={value.required}
                    />
                    <Label 
                      htmlFor={`column-${key}`}
                      className={value.required ? 'font-medium' : ''}
                    >
                      {value.label}
                      {value.required && ' *'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Exporting {data.length} {entityType.toLowerCase()}
              {!includeInactive && ' (active only)'} with {selectedColumns.length} columns
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}