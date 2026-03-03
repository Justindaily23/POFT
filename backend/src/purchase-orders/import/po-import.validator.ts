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

  rows.forEach((row, index) => {
    const rowNo = index + 2;

    requiredFields.forEach((field) => {
      const value = row[field] as unknown;

      // 1. Missing/Empty Check
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`Row ${rowNo}: missing required field "${field}"`);
        return;
      }

      // 2. Numeric Validation
      if (['unitPrice', 'requestedQuantity', 'allowedOpenDays'].includes(field)) {
        // Safe string conversion for numeric cleaning
        const stringified = typeof value === 'string' ? value : formatValue(value);
        const cleanValue = stringified.replace(/[^\d.-]/g, '');
        const num = Number(cleanValue);

        const isZeroAllowed = field === 'allowedOpenDays';
        const isInvalid = isZeroAllowed ? isNaN(num) || num < 0 : isNaN(num) || num <= 0;

        if (isInvalid) {
          errors.push(`Row ${rowNo}: "${field}" must be a positive number (got: ${formatValue(value)})`);
        } else {
          (row[field] as number) = num;
        }
      }

      // 3. Date Validation (Nigeria-friendly UTC)
      if (field === 'poIssuedDate') {
        let date: Date;

        if (typeof value === 'string' && value.includes('/')) {
          const [m, d, y] = value.split('/').map(Number);
          date = new Date(Date.UTC(y, m - 1, d));
        } else if (typeof value === 'string' && value.includes('-')) {
          const [y, m, d] = value.split('-').map(Number);
          date = new Date(Date.UTC(y, m - 1, d));
        } else if (value instanceof Date) {
          date = value;
        } else {
          // Safe conversion before passing to Date constructor
          date = new Date(formatValue(value));
        }

        if (isNaN(date.getTime())) {
          errors.push(`Row ${rowNo}: invalid date format for "poIssuedDate" (got: ${formatValue(value)})`);
        } else if (date > new Date()) {
          errors.push(`Row ${rowNo}: "poIssuedDate" cannot be in the future`);
        } else {
          row.poIssuedDate = date;
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
