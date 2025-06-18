import { Finish } from '../types/finish';
import { validateFinishForm } from './finishValidation';
import Papa from 'papaparse';

// Types
export interface CSVRow {
  [key: string]: string;
}

export interface ImportResult {
  success: boolean;
  errors: ImportError[];
  processedRows: number;
  totalRows: number;
}

export interface ImportError {
  row: number;
  errors: string[];
  data: CSVRow;
}

export interface ExportOptions {
  includeInactive?: boolean;
  selectedColumns?: string[];
  fileName?: string;
}

interface ProgressCallback {
  (progress: { processed: number; total: number }): void;
}

// Constants
const BATCH_SIZE = 100;
const DEFAULT_EXPORT_FILENAME = 'finishes-export.csv';

const FINISH_CSV_MAPPINGS = {
  'Finish Name': 'name',
  'Type': 'type',
  'Cost per sq in': 'costPerSqIn',
  'Lead Time (days)': 'leadTimeDays',
  'Description': 'description',
  'Active': 'active'
};

// Validation
function validateCSVRow(row: CSVRow, rowIndex: number): string[] {
  const errors: string[] = [];
  
  // Check required fields
  const requiredFields = ['Finish Name', 'Type', 'Cost per sq in', 'Lead Time (days)'];
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  // Convert CSV row to form data format for validation
  const formData = {
    name: row['Finish Name'] || '',
    type: row['Type'] || '',
    costPerSqIn: row['Cost per sq in'] || '',
    leadTimeDays: row['Lead Time (days)'] || '',
    description: row['Description'] || '',
    active: row['Active']?.toLowerCase() === 'true'
  };

  // Use existing form validation
  const formErrors = validateFinishForm(formData);
  Object.entries(formErrors).forEach(([field, error]) => {
    errors.push(`${field}: ${error}`);
  });

  return errors;
}

// Import Processing
export async function processCSVImport(
  file: File,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const result: ImportResult = {
      success: true,
      errors: [],
      processedRows: 0,
      totalRows: 0
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      chunk: async (results, parser) => {
        parser.pause();
        
        // Update progress
        result.totalRows += results.data.length;
        if (onProgress) {
          onProgress({
            processed: result.processedRows,
            total: result.totalRows
          });
        }

        // Process chunk
        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as CSVRow;
          const rowIndex = result.processedRows + i + 1;
          
          // Validate row
          const errors = validateCSVRow(row, rowIndex);
          if (errors.length > 0) {
            result.errors.push({
              row: rowIndex,
              errors,
              data: row
            });
            continue;
          }

          // Transform data (will be used when actually importing)
          const finishData = {
            name: row['Finish Name'],
            type: row['Type'],
            costPerSqIn: parseFloat(row['Cost per sq in']),
            leadTimeDays: parseInt(row['Lead Time (days)']),
            description: row['Description'] || '',
            active: row['Active']?.toLowerCase() === 'true'
          };
        }

        result.processedRows += results.data.length;
        parser.resume();
      },
      complete: () => {
        result.success = result.errors.length === 0;
        resolve(result);
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

// Export Processing
export function generateCSVExport(
  finishes: Finish[],
  options: ExportOptions = {}
): string {
  const {
    includeInactive = true,
    selectedColumns = Object.keys(FINISH_CSV_MAPPINGS),
    fileName = DEFAULT_EXPORT_FILENAME
  } = options;

  // Filter finishes if needed
  const filteredFinishes = includeInactive 
    ? finishes 
    : finishes.filter(f => f.active);

  // Transform data for CSV
  const csvData = filteredFinishes.map(finish => {
    const row: CSVRow = {};
    for (const [header, field] of Object.entries(FINISH_CSV_MAPPINGS)) {
      if (selectedColumns.includes(header)) {
        if (field === 'costPerSqIn') {
          row[header] = finish[field].toFixed(3);
        } else if (field === 'active') {
          row[header] = finish[field].toString();
        } else {
          row[header] = finish[field].toString();
        }
      }
    }
    return row;
  });

  // Generate CSV
  return Papa.unparse(csvData, {
    header: true,
    columns: selectedColumns
  });
}

// Download Helper
export function downloadCSV(content: string, filename: string = DEFAULT_EXPORT_FILENAME): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Batch Processing Helper
export async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
  onProgress?: ProgressCallback
): Promise<void> {
  const totalItems = items.length;
  let processedItems = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch);
    
    processedItems += batch.length;
    if (onProgress) {
      onProgress({
        processed: processedItems,
        total: totalItems
      });
    }
  }
}