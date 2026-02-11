// import { PoExcelRow } from './po-import.types';

import { PoExcelRow } from './po-import.types';

// /**
//  * Strict validation for PO Excel import.
//  * Designed for aging, reconciliation, and audit accuracy.
//  */
// export function validateRows(rows: PoExcelRow[]): PoExcelRow[] {
//   const errors: string[] = [];

//   const requiredFields: (keyof PoExcelRow)[] = [
//     'duid',
//     'projectName',
//     'poType',
//     'projectCode',
//     'prNumber',
//     'poNumber',
//     'poIssuedDate', // ✅ REQUIRED (AGING)
//     'pm',
//     'pmId',
//     'poLineNumber',
//     'allowedOpenDays',
//     'itemCode',
//     'itemDescription',
//     'unitPrice',
//     'requestedQuantity',
//   ];

//   rows.forEach((row, index) => {
//     const rowNo = index + 1;

//     requiredFields.forEach((field) => {
//       const value = row[field];

//       // 1️⃣ Missing field
//       if (value === undefined || value === null) {
//         errors.push(`Row ${rowNo}: missing required field "${field}"`);
//         return;
//       }

//       // 2️⃣ Empty string
//       if (typeof value === 'string' && value.trim() === '') {
//         errors.push(`Row ${rowNo}: empty value for required field "${field}"`);
//         return;
//       }

//       // 3️⃣ Invalid numeric fields
//       if (
//         ['unitPrice', 'requestedQuantity'].includes(field) &&
//         (typeof value !== 'number' || isNaN(value) || value <= 0)
//       ) {
//         errors.push(`Row ${rowNo}: invalid numeric value for "${field}"`);
//       }

//       // 4️⃣ PO Issued Date must be valid-ish
//       if (field === 'poIssuedDate') {
//         if ((typeof value === 'number' && value <= 0) || (typeof value === 'string' && !value.includes('/'))) {
//           errors.push(`Row ${rowNo}: invalid poIssuedDate "${value}"`);
//         }
//       }
//     });
//   });

//   if (errors.length) {
//     throw new Error(`PO Excel import validation failed:\n${errors.join('\n')}`);
//   }

//   return rows;
// }

export function validateRows(rows: PoExcelRow[]): PoExcelRow[] {
  const errors: string[] = [];

  const requiredFields: (keyof PoExcelRow)[] = [
    'duid',
    'projectName',
    'poType',
    'projectCode',
    'prNumber',
    'poNumber',
    'poIssuedDate',
    'pm',
    'pmId',
    'poLineNumber',
    'allowedOpenDays',
    'itemCode',
    'itemDescription',
    'unitPrice',
    'requestedQuantity',
  ];

  rows.forEach((row, index) => {
    const rowNo = index + 2; // +2 because Excel starts at 1 and has a header row

    requiredFields.forEach((field) => {
      const value = row[field];

      // 1. Check for Missing/Empty
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`Row ${rowNo}: missing required field "${field}"`);
        return;
      }

      // 2. Numeric Validations (UnitPrice/Quantity must be > 0)
      if (['unitPrice', 'requestedQuantity'].includes(field)) {
        const num = Number(value);
        if (isNaN(num) || num <= 0) {
          errors.push(`Row ${rowNo}: "${field}" must be a positive number (got: ${value})`);
        }
      }

      // 3. PO Issued Date Validation (The "Handshake" with Excel Parser)
      if (field === 'poIssuedDate') {
        const date = new Date(value);
        const isValidDate = date instanceof Date && !isNaN(date.getTime());

        if (!isValidDate) {
          errors.push(`Row ${rowNo}: invalid date format for "poIssuedDate" (got: ${value})`);
        } else if (date > new Date()) {
          // Future-proofing: POs usually shouldn't be issued in the future
          errors.push(`Row ${rowNo}: "poIssuedDate" cannot be in the future`);
        }
      }

      // 4. Allowed Open Days (Must be 0 or greater)
      if (field === 'allowedOpenDays') {
        if (isNaN(Number(value)) || Number(value) < 0) {
          errors.push(`Row ${rowNo}: "allowedOpenDays" must be a non-negative number`);
        }
      }
    });
  });

  if (errors.length) {
    // For Enterprise apps, limit the error output so the UI doesn't crash on 1000+ errors
    const firstTenErrors = errors.slice(0, 10);
    const suffix = errors.length > 10 ? `\n...and ${errors.length - 10} more errors.` : '';
    throw new Error(`Validation failed:\n${firstTenErrors.join('\n')}${suffix}`);
  }

  return rows;
}
