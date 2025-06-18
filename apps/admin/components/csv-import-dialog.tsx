import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { processCSVImport, ImportResult, ImportError } from "@/utils/csvHandling";

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
  entityType: string;
}

export function CSVImportDialog({ isOpen, onClose, onImport, entityType }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    setError(null);
    try {
      const result = await processCSVImport(file, setProgress);
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate file');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !validationResult?.success) return;

    setIsImporting(true);
    setError(null);
    try {
      // Process the import
      await onImport([]); // TODO: Pass actual data
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setError(null);
    setProgress({ processed: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderValidationErrors = (errors: ImportError[]) => (
    <div className="mt-4 max-h-40 overflow-y-auto">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Validation Errors</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-4 mt-2">
            {errors.map((error, index) => (
              <li key={index} className="mt-1">
                Row {error.row}: {error.errors.join(', ')}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      handleReset();
      onClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import {entityType}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import {entityType.toLowerCase()}. The file should include all required fields.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!file && (
            <div className="flex items-center justify-center w-full">
              <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-50">
                <Upload className="w-8 h-8 text-blue-500" />
                <span className="mt-2 text-base leading-normal">Select CSV file</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
              </label>
            </div>
          )}

          {file && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>File Selected</AlertTitle>
                <AlertDescription>{file.name}</AlertDescription>
              </Alert>

              {(isValidating || isImporting) && (
                <div className="space-y-2">
                  <Progress value={(progress.processed / progress.total) * 100} />
                  <p className="text-sm text-gray-500 text-center">
                    Processing {progress.processed} of {progress.total} rows...
                  </p>
                </div>
              )}

              {validationResult && !validationResult.success && (
                renderValidationErrors(validationResult.errors)
              )}

              {validationResult && validationResult.success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700">Validation Successful</AlertTitle>
                  <AlertDescription className="text-green-600">
                    {validationResult.processedRows} rows are ready to import
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isValidating || isImporting}
          >
            Reset
          </Button>
          {file && !validationResult && (
            <Button
              onClick={handleValidate}
              disabled={isValidating || !file}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          )}
          {validationResult && validationResult.success && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}