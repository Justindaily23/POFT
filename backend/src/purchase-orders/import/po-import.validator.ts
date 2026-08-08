import { BadRequestException } from '@nestjs/common';
import { PoExcelRow, ValidationHelpers } from './interfaces/po-import.interface';

export function validateRows(rows: PoExcelRow[], dataVerfication: ValidationHelpers): PoExcelRow[] {
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

      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`Row ${rowNo}: missing required field "${field}"`);
        continue;
      }

      // Numeric Validation
      if (['unitPrice', 'requestedQuantity', 'allowedOpenDays'].includes(field)) {
        let num: number;
        if (typeof value === 'number') {
          num = value;
        } else {
          // Clean the string just like your original code
          const cleanValue = String(value).replace(/[^\d.-]/g, '');
          num = Number(cleanValue);
        }

        // If the loop is processing 'allowedOpenDays', isZeroAllowed becomes true.
        // For all other numeric columns, it becomes false.
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
          errors.push(
            `Row ${rowNo}: Invalid date in column "PO_ISSUED_DATE" (got: "${formatValue(value)}"). Please use YYYY-MM-DD or MM/DD/YYYY format.`,
          );
        } else if (date > new Date()) {
          errors.push(`Row ${rowNo}: "poIssuedDate" cannot be in the future`);
        } else {
          row.poIssuedDate = date;
        }
      }
    }

    const normalizedPoType = row.poType?.toString().trim().toUpperCase().replace(/\s+/g, '_') || '';
    const normalizedPmId = row.pmId?.toString().trim() || '';

    // 1. Check if the excel PO_TYPE matches actual record
    if (!dataVerfication.validPoTypeCodes.has(normalizedPoType)) {
      errors.push(`Row ${rowNo}: Invalid PO_TYPE "${row.poType}". This Po type does not exist in the database.`);
    }

    // 2. Check if the Excel PM_ID matches an actual user/staff record in your database
    if (!dataVerfication.validPmIds.has(normalizedPmId)) {
      errors.push(`Row ${rowNo}: Invalid PM_ID "${row.pmId}". No matching Project Manager found in the database.`);
    }

    rowNo++;
  }

  // Your original error reporting logic remains untouched
  if (errors.length) {
    const firstTenErrors = errors.slice(0, 10);
    const suffix = errors.length > 10 ? `\n...and ${errors.length - 10} more errors.` : '';
    throw new BadRequestException(`Validation failed:\n${firstTenErrors.join('\n')}${suffix}`);
  }

  return rows;
}
