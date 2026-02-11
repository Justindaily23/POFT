import { PoExcelRow } from './po-import.types';

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
          // FIX: Convert value to string for the template literal
          const displayValue = String(value);
          errors.push(`Row ${rowNo}: "${field}" must be a positive number (got: ${displayValue})`);
        }
      }

      // 3. PO Issued Date Validation (The "Handshake" with Excel Parser)
      if (field === 'poIssuedDate') {
        const date = new Date(value);
        const isValidDate = date instanceof Date && !isNaN(date.getTime());

        if (!isValidDate) {
          // FIX: Convert value to string for the template literal
          const displayValue = String(value);
          errors.push(`Row ${rowNo}: invalid date format for "poIssuedDate" (got: ${displayValue})`);
        } else if (date > new Date()) {
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
    const firstTenErrors = errors.slice(0, 10);
    const suffix = errors.length > 10 ? `\n...and ${errors.length - 10} more errors.` : '';
    throw new Error(`Validation failed:\n${firstTenErrors.join('\n')}${suffix}`);
  }

  return rows;
}
