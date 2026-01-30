import { PoExcelRow } from './po-import.types';

/**
 * Strict validation for PO Excel import.
 * Designed for aging, reconciliation, and audit accuracy.
 */
export function validateRows(rows: PoExcelRow[]): PoExcelRow[] {
  const errors: string[] = [];

  const requiredFields: (keyof PoExcelRow)[] = [
    'duid',
    'projectName',
    'poType',
    'projectCode',
    'prNumber',
    'poNumber',
    'poIssuedDate', // ✅ REQUIRED (AGING)
    'pm',
    'poLineNumber',
    'itemCode',
    'itemDescription',
    'unitPrice',
    'requestedQuantity',
  ];

  rows.forEach((row, index) => {
    const rowNo = index + 1;

    requiredFields.forEach((field) => {
      const value = row[field];

      // 1️⃣ Missing field
      if (value === undefined || value === null) {
        errors.push(`Row ${rowNo}: missing required field "${field}"`);
        return;
      }

      // 2️⃣ Empty string
      if (typeof value === 'string' && value.trim() === '') {
        errors.push(`Row ${rowNo}: empty value for required field "${field}"`);
        return;
      }

      // 3️⃣ Invalid numeric fields
      if (
        ['unitPrice', 'requestedQuantity'].includes(field) &&
        (typeof value !== 'number' || isNaN(value) || value <= 0)
      ) {
        errors.push(`Row ${rowNo}: invalid numeric value for "${field}"`);
      }

      // 4️⃣ PO Issued Date must be valid-ish
      if (field === 'poIssuedDate') {
        if ((typeof value === 'number' && value <= 0) || (typeof value === 'string' && !value.includes('/'))) {
          errors.push(`Row ${rowNo}: invalid poIssuedDate "${value}"`);
        }
      }
    });
  });

  if (errors.length) {
    throw new Error(`PO Excel import validation failed:\n${errors.join('\n')}`);
  }

  return rows;
}
