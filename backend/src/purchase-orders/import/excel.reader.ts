import * as XLSX from 'xlsx';

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
  PO_LINE_NUMBER: 'poLineNumber',
  ITEM_CODE: 'itemCode',
  ITEM_DESCRIPTION: 'itemDescription',
  UNIT_PRICE: 'unitPrice',
  REQUESTED_QUANTITY: 'requestedQuantity',
  PO_LINE_AMOUNT: 'poLineAmount',
};

/**
 * Reads an Excel file, normalizes headers to camelCase, and returns rows.
 */
export function readExcel(filePath: string): any[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const normalizedRows = rawRows.map((row: any) => {
    const normalized: any = {};
    for (const key in row) {
      const dbKey = headerMap[key.trim()];
      if (dbKey) {
        normalized[dbKey] = row[key];
      }
    }
    return normalized;
  });

  return normalizedRows;
}
