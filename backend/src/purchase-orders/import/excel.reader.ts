import * as XLSX from 'xlsx';
import * as path from 'path';
import { PoExcelRow } from './interfaces/po-import.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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
 * Reads an Excel file, normalizes headers, and returns structured PoExcelRow objects.
 * Deep data validation happens in the next stage.
 */
export function readExcel(fileBuffer: Buffer, fileName: string): PoExcelRow[] {
  // 1. FILE GUARDS — now validate the buffer + provided filename, not a disk path
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new BadRequestException('File data is missing or empty');
  }
  const fileExtention = path.extname(fileName).toLowerCase();
  const allowedExtensions = ['.xlsx', '.xls'];
  if (!allowedExtensions.includes(fileExtention)) throw new BadRequestException('Only Excel files are allowed');

  // if (!fs.existsSync(filePath)) {
  //   throw new NotFoundException(`File not found at the specified path: ${filePath}`);
  // }

  // 2. PARSE WORKBOOK
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' });
  } catch (error) {
    throw new BadRequestException('The uploaded file is corrupted or is not a valid Excel spreadsheet.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (!rawRows || rawRows.length === 0) {
    throw new BadRequestException('The uploaded spreadsheet contains no data rows.');
  }

  // 3. TEMPLATE HEADER MATCHING GUARD
  const excelHeaders = Object.keys(rawRows[0]).map((header) => header.trim());
  const expectedHeaders = Object.keys(headerMap);

  for (const expectedHeader of expectedHeaders) {
    if (!excelHeaders.includes(expectedHeader)) {
      throw new BadRequestException(
        `Template Error: Missing expected header "${expectedHeader}". Please use the correct template.`,
      );
    }
  }

  // 4. STRUCTURAL MAPPING ONLY
  return rawRows.map((row) => {
    const normalized = {} as PoExcelRow;

    for (const [key, value] of Object.entries(row)) {
      const trimmedKey = key.trim();
      const dbKey = headerMap[trimmedKey];

      if (dbKey) {
        let finalValue = value;

        // Date normalisation logic remains here to assist SheetJS parsing
        if (dbKey === 'poIssuedDate' && finalValue instanceof Date) {
          finalValue.setHours(0, 0, 0, 0);
        }

        const keyToSet = dbKey;
        (normalized as Record<keyof PoExcelRow, unknown>)[keyToSet] = finalValue;
      }
    }
    return normalized;
  });
}
