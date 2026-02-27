import * as XLSX from 'xlsx';
import { PoExcelRow } from './po-import.types';

// Map Excel headers to your DB fields
const headerMap: Record<string, keyof PoExcelRow> = {
  DU_ID: 'duid',
  PROJECT_NAME: 'projectName',
  PROJECT_CODE: 'projectCode',
  PO_TYPE: 'poType',
  PR_NUMBER: 'prNumber',
  PO_NUMBER: 'poNumber',
  PO_ISSUED_DATE: 'poIssuedDate',
  PM: 'pm',
  PM_ID: 'pmId',
  ALLOWED_OPEN_DAYS: 'allowedOpenDays',
  PO_LINE_NUMBER: 'poLineNumber',
  ITEM_CODE: 'itemCode',
  ITEM_DESCRIPTION: 'itemDescription',
  UNIT_PRICE: 'unitPrice',
  REQUESTED_QUANTITY: 'requestedQuantity',
};

/**
 * Reads an Excel file, normalizes headers, and returns typed PoExcelRow objects.
 */
export function readExcel(filePath: string): PoExcelRow[] {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // FIX: Type rawRows as Record<string, unknown>[] to avoid 'any'
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  return rawRows.map((row) => {
    // Start with a partial to avoid "missing properties" errors during construction
    const normalized = {} as PoExcelRow;

    // Use Object.entries on the typed row
    for (const [key, value] of Object.entries(row)) {
      const trimmedKey = key.trim();
      const dbKey = headerMap[trimmedKey];

      if (dbKey) {
        const finalValue = value;

        // Date normalization logic remains identical
        if (dbKey === 'poIssuedDate' && finalValue instanceof Date) {
          finalValue.setHours(0, 0, 0, 0);
        }

        // Use a type-safe assignment instead of (normalized as any)
        // This tells TS: "I am setting a valid key of PoExcelRow"
        const keyToSet = dbKey;
        (normalized as Record<keyof PoExcelRow, unknown>)[keyToSet] = finalValue;
      }
    }
    return normalized;
  });
}
