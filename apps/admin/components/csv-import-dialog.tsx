"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

interface CSVImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: any[]) => void
  entityType: "materials" | "processes" | "finishes" | "routings"
  fieldMappings: Record<string, { label: string; required: boolean; type: string; options?: string[] }>
}

interface ParsedCSV {
  headers: string[]
  data: string[][]
  preview: string[][]
}

interface FieldMapping {
  csvHeader: string
  dbField: string
  confidence: number
}

interface ValidationError {
  row: number
  field: string
  value: string
  error: string
}

export function CSVImportDialog({ isOpen, onClose, onImport, entityType, fieldMappings }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [step, setStep] = useState<"upload" | "mapping" | "validation" | "preview">("upload")
  const [importOptions, setImportOptions] = useState({
    skipFirstRow: true,
    updateExisting: false,
    validateOnly: false,
  })

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = event.target.files?.[0]
      if (!uploadedFile) return

      setFile(uploadedFile)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())

        if (lines.length === 0) return

        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
        const dataRows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim().replace(/"/g, "")))

        const preview = dataRows.slice(0, 5) // Show first 5 rows for preview

        setParsedCSV({
          headers,
          data: dataRows,
          preview,
        })

        // Auto-generate smart mappings
        const smartMappings = generateSmartMappings(headers, fieldMappings)
        setMappings(smartMappings)
        setStep("mapping")
      }

      reader.readAsText(uploadedFile)
    },
    [fieldMappings],
  )

  const generateSmartMappings = (csvHeaders: string[], dbFields: Record<string, any>): Record<string, string> => {
    const mappings: Record<string, string> = {}

    csvHeaders.forEach((csvHeader) => {
      const normalizedCsvHeader = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, "")
      let bestMatch = ""
      let bestScore = 0

      Object.keys(dbFields).forEach((dbField) => {
        const normalizedDbField = dbField.toLowerCase().replace(/[^a-z0-9]/g, "")
        const score = calculateSimilarity(normalizedCsvHeader, normalizedDbField)

        // Also check against the label
        const labelScore = calculateSimilarity(
          normalizedCsvHeader,
          dbFields[dbField].label.toLowerCase().replace(/[^a-z0-9]/g, ""),
        )

        const maxScore = Math.max(score, labelScore)
        if (maxScore > bestScore && maxScore > 0.6) {
          bestMatch = dbField
          bestScore = maxScore
        }
      })

      if (bestMatch) {
        mappings[csvHeader] = bestMatch
      }
    })

    return mappings
  }

  const calculateSimilarity = (str1: string, str2: string): number => {
    // Simple similarity calculation using Levenshtein distance
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
      }
    }

    const distance = matrix[str2.length][str1.length]
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - distance / maxLength
  }

  const validateData = () => {
    if (!parsedCSV) return

    setIsValidating(true)
    const errors: ValidationError[] = []

    parsedCSV.data.forEach((row, rowIndex) => {
      Object.entries(mappings).forEach(([csvHeader, dbField]) => {
        const csvIndex = parsedCSV.headers.indexOf(csvHeader)
        const value = row[csvIndex]
        const fieldConfig = fieldMappings[dbField]

        if (!fieldConfig) return

        // Check required fields
        if (fieldConfig.required && (!value || value.trim() === "")) {
          errors.push({
            row: rowIndex + 1,
            field: fieldConfig.label,
            value: value || "",
            error: "Required field is empty",
          })
        }

        // Type validation
        if (value && value.trim()) {
          switch (fieldConfig.type) {
            case "number":
              if (isNaN(Number(value))) {
                errors.push({
                  row: rowIndex + 1,
                  field: fieldConfig.label,
                  value,
                  error: "Must be a valid number",
                })
              }
              break
            case "email":
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push({
                  row: rowIndex + 1,
                  field: fieldConfig.label,
                  value,
                  error: "Must be a valid email address",
                })
              }
              break
            case "select":
              if (fieldConfig.options && !fieldConfig.options.includes(value)) {
                errors.push({
                  row: rowIndex + 1,
                  field: fieldConfig.label,
                  value,
                  error: `Must be one of: ${fieldConfig.options.join(", ")}`,
                })
              }
              break
          }
        }
      })
    })

    setValidationErrors(errors)
    setIsValidating(false)
    setStep("validation")
  }

  const processImport = () => {
    if (!parsedCSV) return

    const processedData = parsedCSV.data.map((row) => {
      const item: any = {}

      Object.entries(mappings).forEach(([csvHeader, dbField]) => {
        const csvIndex = parsedCSV.headers.indexOf(csvHeader)
        let value: any = row[csvIndex]

        // Type conversion
        const fieldConfig = fieldMappings[dbField]
        if (fieldConfig?.type === "number" && value) {
          value = Number(value)
        } else if (fieldConfig?.type === "boolean") {
          value = ["true", "yes", "1", "on"].includes(value.toLowerCase())
        }

        item[dbField] = value
      })

      // Add default values for unmapped required fields
      Object.entries(fieldMappings).forEach(([dbField, config]) => {
        if (config.required && !(dbField in item)) {
          switch (config.type) {
            case "number":
              item[dbField] = 0
              break
            case "boolean":
              item[dbField] = false
              break
            default:
              item[dbField] = ""
          }
        }
      })

      return item
    })

    onImport(processedData)
    handleClose()
  }

  const handleClose = () => {
    setFile(null)
    setParsedCSV(null)
    setMappings({})
    setValidationErrors([])
    setStep("upload")
    onClose()
  }

  const downloadTemplate = () => {
    const headers = Object.entries(fieldMappings).map(([key, config]) => config.label)
    const csvContent = headers.join(",") + "\n"

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entityType}_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getMappingConfidence = (csvHeader: string, dbField: string): number => {
    const normalizedCsvHeader = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, "")
    const normalizedDbField = dbField.toLowerCase().replace(/[^a-z0-9]/g, "")
    const labelScore = calculateSimilarity(
      normalizedCsvHeader,
      fieldMappings[dbField]?.label.toLowerCase().replace(/[^a-z0-9]/g, "") || "",
    )
    return Math.max(calculateSimilarity(normalizedCsvHeader, normalizedDbField), labelScore)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50"
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const requiredFieldsMapped = Object.entries(fieldMappings)
    .filter(([_, config]) => config.required)
    .every(([field]) => Object.values(mappings).includes(field))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)} from CSV
          </DialogTitle>
          <DialogDescription>Upload a CSV file and map the columns to import data into your system</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {["upload", "mapping", "validation", "preview"].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? "bg-blue-600 text-white"
                      : index < ["upload", "mapping", "validation", "preview"].indexOf(step)
                        ? "bg-green-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {index < ["upload", "mapping", "validation", "preview"].indexOf(step) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="ml-2 text-sm font-medium capitalize">{stepName}</span>
                {index < 3 && <div className="w-12 h-px bg-slate-300 mx-4" />}
              </div>
            ))}
          </div>

          {/* Step 1: File Upload */}
          {step === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload CSV File
                </CardTitle>
                <CardDescription>
                  Select a CSV file to import. The first row should contain column headers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="text-lg font-medium">Choose CSV file</span>
                      <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </Label>
                    <p className="text-sm text-slate-500">or drag and drop your file here</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="skipFirstRow"
                      checked={importOptions.skipFirstRow}
                      onCheckedChange={(checked) => setImportOptions({ ...importOptions, skipFirstRow: !!checked })}
                    />
                    <Label htmlFor="skipFirstRow" className="text-sm">
                      First row contains headers
                    </Label>
                  </div>
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    size="sm"
                    className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {file && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      File uploaded: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Field Mapping */}
          {step === "mapping" && parsedCSV && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Map CSV Columns to Database Fields</CardTitle>
                  <CardDescription>
                    We've automatically suggested mappings based on column names. Review and adjust as needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parsedCSV.headers.map((header) => (
                      <div key={header} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <Label className="font-medium">{header}</Label>
                          <p className="text-sm text-slate-500">
                            Sample: {parsedCSV.preview[0]?.[parsedCSV.headers.indexOf(header)] || "N/A"}
                          </p>
                        </div>
                        <div className="flex-1">
                          <Select
                            value={mappings[header] || ""}
                            onValueChange={(value) => setMappings({ ...mappings, [header]: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field to map to" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Don't import this column</SelectItem>
                              {Object.entries(fieldMappings).map(([field, config]) => (
                                <SelectItem key={field} value={field}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{config.label}</span>
                                    {config.required && (
                                      <Badge variant="destructive" className="ml-2 text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {mappings[header] && (
                          <Badge
                            className={`text-xs ${getConfidenceColor(getMappingConfidence(header, mappings[header]))}`}
                          >
                            {Math.round(getMappingConfidence(header, mappings[header]) * 100)}% match
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {!requiredFieldsMapped && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Some required fields are not mapped. Please map all required fields to continue.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview</CardTitle>
                  <CardDescription>Preview of how your data will be imported</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.values(mappings)
                            .filter(Boolean)
                            .map((dbField) => (
                              <TableHead key={dbField}>{fieldMappings[dbField]?.label}</TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedCSV.preview.slice(0, 3).map((row, index) => (
                          <TableRow key={index}>
                            {Object.entries(mappings)
                              .filter(([_, dbField]) => dbField)
                              .map(([csvHeader, dbField]) => {
                                const csvIndex = parsedCSV.headers.indexOf(csvHeader)
                                return (
                                  <TableCell key={dbField} className="max-w-32 truncate">
                                    {row[csvIndex] || "—"}
                                  </TableCell>
                                )
                              })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Validation */}
          {step === "validation" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validationErrors.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Data Validation
                </CardTitle>
                <CardDescription>
                  {validationErrors.length === 0
                    ? "All data looks good! Ready to import."
                    : `Found ${validationErrors.length} validation errors that need to be fixed.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationErrors.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {validationErrors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Row {error.row}:</strong> {error.field} - {error.error}
                          {error.value && <span className="block text-sm mt-1">Value: "{error.value}"</span>}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-900">Validation Passed!</h3>
                    <p className="text-green-700">{parsedCSV?.data.length} rows ready to import</p>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="updateExisting"
                      checked={importOptions.updateExisting}
                      onCheckedChange={(checked) => setImportOptions({ ...importOptions, updateExisting: !!checked })}
                    />
                    <Label htmlFor="updateExisting" className="text-sm">
                      Update existing records if they already exist
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="validateOnly"
                      checked={importOptions.validateOnly}
                      onCheckedChange={(checked) => setImportOptions({ ...importOptions, validateOnly: !!checked })}
                    />
                    <Label htmlFor="validateOnly" className="text-sm">
                      Validate only (don't actually import)
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === "upload" && file && <Button onClick={() => setStep("mapping")}>Next: Map Fields</Button>}
          {step === "mapping" && (
            <Button onClick={validateData} disabled={!requiredFieldsMapped}>
              Next: Validate Data
            </Button>
          )}
          {step === "validation" && validationErrors.length === 0 && (
            <Button onClick={processImport} className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]">
              {importOptions.validateOnly ? "Validate Complete" : "Import Data"}
            </Button>
          )}
          {step === "validation" && validationErrors.length > 0 && (
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Back to Mapping
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
