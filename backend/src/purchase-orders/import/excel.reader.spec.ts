import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { readExcel } from './excel.reader';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('fs');
jest.mock('xlsx', () => ({
  ...jest.requireActual('xlsx'),
  readFile: jest.fn(),
}));

describe('readExcel Unit Tests', () => {
  const mockFilePath = '/tmp/test-file.xlsx';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Boundary and Path validation', () => {
    it('should throw BadRequestException if file path is empty', () => {
      expect(() => readExcel('')).toThrow(BadRequestException);
      expect(() => readExcel('  ')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported file extensions', () => {
      expect(() => readExcel('/tmp/test-file.txt')).toThrow(BadRequestException);
      expect(() => readExcel('tmp/script.exe')).toThrow(BadRequestException);
    });

    it('should throw NotFoundException if file does not exist on disk', () => {
      // Force fs.existsSync to return flase
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(() => readExcel(mockFilePath)).toThrow(NotFoundException);
    });
  });

  describe('Workbook Parsing and Corruption Validation', () => {
    it('should throw BadRequestException if XLSX library fails to parse the file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Spy on readFile and simulate a low-level library crash (corrupt file)
      jest.spyOn(XLSX, 'readFile').mockImplementation(() => {
        throw new Error('Low level zip reading error');
      });

      expect(() => readExcel(mockFilePath)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the parsed spreadsheet has no data rows', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Provide an empty workbook payload setup
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });

      jest.spyOn(XLSX.utils, 'sheet_to_json').mockReturnValue([]);

      expect(() => readExcel(mockFilePath)).toThrow(
        new BadRequestException('The uploaded spreadsheet contains no data rows.'),
      );
    });
  });

  describe('Template Header & Mapping Validation', () => {
    it('should throw BadRequestException if a required header is missing from the template', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });

      // Return a row missing critical headers like 'PO_NUMBER'
      jest.spyOn(XLSX.utils, 'sheet_to_json').mockReturnValue([
        {
          DU_ID: 'DU-101',
          PROJECT_NAME: 'Alpha Project',
          // missing remaining required properties...
        },
      ]);

      expect(() => readExcel(mockFilePath)).toThrow(BadRequestException);
    });

    it('should successfully map raw Excel fields to camelCase properties when template matches perfectly', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockExcelDate = new Date('2026-08-05T12:00:00.000Z');

      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });

      // Supply an array matching ALL 15 headers in your map exactly
      jest.spyOn(XLSX.utils, 'sheet_to_json').mockReturnValue([
        {
          DU_ID: 'DU-001',
          PROJECT_NAME: 'Project Nexus',
          PROJECT_CODE: 'PRJ-NEX',
          PO_TYPE: 'Standard',
          PR_NUMBER: 'PR-999',
          PO_NUMBER: 'PO-777',
          PO_ISSUED_DATE: mockExcelDate,
          PM: 'John Doe',
          PM_ID: 'PM-44',
          ALLOWED_OPEN_DAYS: 30,
          PO_LINE_NUMBER: 'L1',
          ITEM_CODE: 'ITM-88',
          ITEM_DESCRIPTION: 'Server hardware',
          UNIT_PRICE: 1500,
          REQUESTED_QUANTITY: 5,
        },
      ]);

      const result = readExcel(mockFilePath);

      // Assert array size
      expect(result).toHaveLength(1);

      // Verify transformation logic (Snake_Case -> CamelCase)
      expect(result[0]).toEqual({
        duid: 'DU-001',
        projectName: 'Project Nexus',
        projectCode: 'PRJ-NEX',
        poType: 'Standard',
        prNumber: 'PR-999',
        poNumber: 'PO-777',
        poIssuedDate: expect.any(Date),
        pm: 'John Doe',
        pmId: 'PM-44',
        allowedOpenDays: 30,
        poLineNumber: 'L1',
        itemCode: 'ITM-88',
        itemDescription: 'Server hardware',
        unitPrice: 1500,
        requestedQuantity: 5,
      });

      // Verify date timestamp was successfully forced to midnight hours
      expect(result[0].poIssuedDate.getHours()).toBe(0);
      expect(result[0].poIssuedDate.getMinutes()).toBe(0);
    });
  });
});
