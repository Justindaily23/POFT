import { PoExcelRow } from './po-import.types';

export function validateRows(rows: PoExcelRow[]): PoExcelRow[] {
  const errors: string[] = [];
  // Helper to safely stringify unknown values for error messages
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'null';

    // 1. Handle Objects & Dates
    if (typeof val === 'object') {
      if (val instanceof Date) return val.toISOString();
      try {
        return JSON.stringify(val);
      } catch {
        return '[Complex Object]';
      }
    }

    // 2. Handle Primitives explicitly to satisfy restrict-template-expressions
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return val.toString();

    // 3. Fallback for anything else (symbols, bigints, etc.)
    return 'unknown value';
  };

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

  let rowNo = 2;
  for (const row of rows) {
    for (const field of requiredFields) {
      const value = row[field];

      // 1. Maintain your exact missing/empty check
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`Row ${rowNo}: missing required field "${field}"`);
        continue;
      }

      // 2. Numeric Validation (Preserving your cleaning logic)
      if (['unitPrice', 'requestedQuantity', 'allowedOpenDays'].includes(field)) {
        let num: number;
        if (typeof value === 'number') {
          num = value;
        } else {
          // Clean the string just like your original code
          const cleanValue = String(value).replace(/[^\d.-]/g, '');
          num = Number(cleanValue);
        }

        const isZeroAllowed = field === 'allowedOpenDays';
        const isInvalid = isZeroAllowed ? isNaN(num) || num < 0 : isNaN(num) || num <= 0;

        if (isInvalid) {
          errors.push(`Row ${rowNo}: "${field}" must be a positive number (got: ${formatValue(value)})`);
        } else {
          // Type-safe assignment without 'any'
          (row[field] as number) = num;
        }
      }

      // 3. Date Validation (Preserving your specific UTC format)
      if (field === 'poIssuedDate') {
        let date: Date;
        if (value instanceof Date) {
          date = value;
        } else {
          const strVal = String(value);
          if (strVal.includes('/')) {
            const [m, d, y] = strVal.split('/').map(Number);
            date = new Date(Date.UTC(y, m - 1, d));
          } else if (strVal.includes('-')) {
            const [y, m, d] = strVal.split('-').map(Number);
            date = new Date(Date.UTC(y, m - 1, d));
          } else {
            date = new Date(strVal);
          }
        }
        if (isNaN(date.getTime())) {
          errors.push(`Row ${rowNo}: invalid date format for "poIssuedDate" (got: ${formatValue(value)})`);
        } else if (date > new Date()) {
          errors.push(`Row ${rowNo}: "poIssuedDate" cannot be in the future`);
        } else {
          row.poIssuedDate = date;
        }
      }
    }
    rowNo++;
  }

  // Your original error reporting logic remains untouched
  if (errors.length) {
    const firstTenErrors = errors.slice(0, 10);
    const suffix = errors.length > 10 ? `\n...and ${errors.length - 10} more errors.` : '';
    throw new Error(`Validation failed:\n${firstTenErrors.join('\n')}${suffix}`);
  }

  return rows;
}
