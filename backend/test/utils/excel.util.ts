// test/utils/excel.util.ts
import * as XLSX from 'xlsx';

export function createPoExcelBuffer(rows: any[]) {
  // Rows must use the EXACT keys from your headerMap (DU_ID, etc.)
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PO_Data');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
