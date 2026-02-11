import * as XLSX from 'xlsx';
import { PoExcelRow } from './po-import.types';

// Map Excel headers to your DB fields
const headerMap: Record<string, string> = {
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
/**
 * Reads an Excel file, normalizes headers, and returns typed PoExcelRow objects.
 */
export function readExcel(filePath: string): PoExcelRow[] {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rawRows.map((row) => {
    const normalized = {} as PoExcelRow;

    // Use Object.entries to safely iterate over an 'unknown' object
    for (const [key, value] of Object.entries(row as object)) {
      const dbKey = headerMap[key.trim()] as keyof PoExcelRow;

      if (dbKey) {
        const finalValue = value;

        if (dbKey === 'poIssuedDate' && finalValue instanceof Date) {
          finalValue.setHours(0, 0, 0, 0);
        }

        (normalized as any)[dbKey] = finalValue;
      }
    }
    return normalized;
  });
}
