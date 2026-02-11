// import * as XLSX from 'xlsx';
// import { PoExcelRow } from './po-import.types';

// // Map Excel headers to your DB fields
// const headerMap: Record<string, string> = {
//   DU_ID: 'duid',
//   PROJECT_NAME: 'projectName',
//   PROJECT_CODE: 'projectCode',
//   PO_TYPE: 'poType',
//   PR_NUMBER: 'prNumber',
//   PO_NUMBER: 'poNumber',
//   PO_ISSUED_DATE: 'poIssuedDate',
//   PM: 'pm',
//   PM_ID: 'pmId',
//   ALLOWED_OPEN_DAYS: 'allowedOpenDays',
//   PO_LINE_NUMBER: 'poLineNumber',
//   ITEM_CODE: 'itemCode',
//   ITEM_DESCRIPTION: 'itemDescription',
//   UNIT_PRICE: 'unitPrice',
//   REQUESTED_QUANTITY: 'requestedQuantity',
// };

// /**
//  * Reads an Excel file, normalizes headers to camelCase, and returns rows.
//  */
// export function readExcel(filePath: string): PoExcelRow[] {
//   const workbook = XLSX.readFile(filePath, {
//     cellDates: true,
//     dateNF: 'yyyy-mm-dd',
//   });
//   const sheet = workbook.Sheets[workbook.SheetNames[0]];

//   const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

//   const normalizedRows = rawRows.map((row: PoExcelRow) => {
//     const normalized = {} as PoExcelRow;
//     for (const key in row) {
//       const dbKey = headerMap[key.trim()] as keyof PoExcelRow;

//       let value = row[key];
//         // Date normalization
//         if (dbKey === 'poIssuedDate' && value instanceof Date) {
//           value.setHours(0, 0, 0, 0);
//         }

//         // CRITICAL FIX: You must assign the value to the object!
//         (normalized as any)[dbKey] = value;
//       }
//     }
//     return normalized;
//   });
//   return normalizedRows;
// }
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
export function readExcel(filePath: string): PoExcelRow[] {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // 1. Cast sheet_to_json to any[] temporarily because SheetJS output is dynamic
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];

  return rawRows.map((row) => {
    // 2. Initialize with an empty object cast to your interface
    const normalized = {} as PoExcelRow;

    for (const key in row) {
      // 3. Ensure the key from Excel matches a key in your PoExcelRow interface
      const dbKey = headerMap[key.trim()] as keyof PoExcelRow;

      if (dbKey) {
        let value = row[key];

        // 4. Date normalization (already solid logic)
        if (dbKey === 'poIssuedDate' && value instanceof Date) {
          value.setHours(0, 0, 0, 0);
        }

        // 5. Final assignment to the normalized object
        (normalized as any)[dbKey] = value;
      }
    }
    return normalized;
  });
}
