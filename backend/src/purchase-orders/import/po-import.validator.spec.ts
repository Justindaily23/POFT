import { validateRows } from './po-import.validator';
import { PoExcelRow } from './interfaces/po-import.interface';
import { BadRequestException } from '@nestjs/common';

describe('validateRows Unit Tests', () => {
  const mockHelpers = {
    validPoTypeCodes: new Set(['Standard', 'Express']),
    validPmIds: new Set(['PM-44', 'PM-100']),
  };

  // A helper to generate a perfectly valid row for baseline tests
  const createValidRow = (overrides?: Partial<PoExcelRow>): PoExcelRow => ({
    duid: 'DU-101',
    projectName: 'Alpha Project',
    poType: 'Standard',
    projectCode: 'PRJ-ALP',
    prNumber: 'PR-111',
    poNumber: 'PO-222',
    poIssuedDate: new Date('2026-01-01'),
    pm: 'John Doe',
    pmId: 'PM-44',
    poLineNumber: '1',
    allowedOpenDays: 10,
    itemCode: 'ITM-99',
    itemDescription: 'Laptops',
    unitPrice: 500,
    requestedQuantity: 2,
    ...overrides,
  });

  it('should pass cleanly and return rows if all fields are valid', () => {
    const validRows = [createValidRow()];

    const result = validateRows(validRows, mockHelpers);

    expect(result).toHaveLength(1);
  });

  describe('Database Foreign Key Integrity Validation', () => {
    it('should throw BadRequestException if PO_TYPE or PM_ID do not exist in database sets', () => {
      const badDbRow = createValidRow({
        poType: 'FakeType', // Missing from mockHelpers Set
        pmId: 'FakePM', // Missing from mockHelpers Set
      });

      try {
        validateRows([badDbRow], mockHelpers);
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Invalid PO_TYPE "FakeType"');
        expect(error.message).toContain('Invalid PM_ID "FakePM"');
      }
    });
  });

  describe('Empty Field Boundary Validation', () => {
    it('should throw BadRequestException if a required field is null, undefined, or white space', () => {
      const badRows = [
        createValidRow({ projectName: null as any }),
        createValidRow({ pm: undefined }),
        createValidRow({ prNumber: '   ' }), // Empty whitespace test
      ];

      expect(() => validateRows(badRows, mockHelpers)).toThrow(BadRequestException);

      try {
        validateRows(badRows, mockHelpers);
      } catch (error: any) {
        expect(error.message).toContain('missing required field "projectName"');
        expect(error.message).toContain('missing required field "pm"');
        expect(error.message).toContain('missing required field "prNumber"');
      }
    });
  });

  describe('Numeric Sanitization & Boundary Rules', () => {
    it('should strip symbols from numeric strings and convert them into true numbers', () => {
      const rowWithCurrencyString = createValidRow({
        unitPrice: '$1,500.25' as any,
        requestedQuantity: '5' as any,
      });

      const result = validateRows([rowWithCurrencyString], mockHelpers);

      // Assert value cleanups
      expect(result[0].unitPrice).toBe(1500.25);
      expect(result[0].requestedQuantity).toBe(5);
      expect(typeof result[0].unitPrice).toBe('number');
    });

    it('should allow 0 for allowedOpenDays but reject it for unitPrice and requestedQuantity', () => {
      // 1. Zero is valid here
      const zeroOpenDaysRow = createValidRow({ allowedOpenDays: 0 });
      expect(() => validateRows([zeroOpenDaysRow], mockHelpers)).not.toThrow();

      // 2. Zero is invalid here
      const zeroPriceRow = createValidRow({ unitPrice: 0 });
      expect(() => validateRows([zeroPriceRow], mockHelpers)).toThrow(BadRequestException);
    });

    it('should reject negative values across all numeric options', () => {
      const badRow = createValidRow({ allowedOpenDays: -5 });
      expect(() => validateRows([badRow], mockHelpers)).toThrow(BadRequestException);
    });
  });

  describe('Date Parsing Matrix', () => {
    it('should parse slash (MM/DD/YYYY) strings into accurate UTC date objects', () => {
      const textDateRow = createValidRow({ poIssuedDate: '08/05/2026' as any });
      const result = validateRows([textDateRow], mockHelpers);

      expect(result[0].poIssuedDate).toBeInstanceOf(Date);
      expect(result[0].poIssuedDate.getUTCFullYear()).toBe(2026);
      expect(result[0].poIssuedDate.getUTCMonth()).toBe(7); // August is 7 (0-indexed)
      expect(result[0].poIssuedDate.getUTCDate()).toBe(5);
    });

    it('should parse dash (YYYY-MM-DD) strings into accurate UTC date objects', () => {
      const textDateRow = createValidRow({ poIssuedDate: '2026-08-05' as any });
      const result = validateRows([textDateRow], mockHelpers);

      expect(result[0].poIssuedDate.getUTCFullYear()).toBe(2026);
      expect(result[0].poIssuedDate.getUTCDate()).toBe(5);
    });

    it('should throw an error with clear formatting hints if date string is completely invalid', () => {
      const badDateRow = createValidRow({ poIssuedDate: 'not-a-date' as any });

      try {
        validateRows([badDateRow], mockHelpers);
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Please use YYYY-MM-DD or MM/DD/YYYY format.');
      }
    });

    it('should reject purchase orders dated in the future', () => {
      // Create a date far in the future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 5);

      const futureRow = createValidRow({ poIssuedDate: futureDate });

      try {
        validateRows([futureRow], mockHelpers);
      } catch (error: any) {
        expect(error.message).toContain('cannot be in the future');
      }
    });
  });

  describe('Error Output Flood Controls', () => {
    it('should limit error output block to 10 lines and append a dynamic counter suffix', () => {
      // Create a row that breaks multiple constraints simultaneously
      const messyRow = createValidRow({
        duid: null as any,
        projectName: null as any,
        poType: null as any,
        projectCode: null as any,
        prNumber: null as any,
        poNumber: null as any,
        pm: null as any,
        pmId: null as any,
        poLineNumber: null as any,
        itemCode: null as any,
        unitPrice: -50, // 11th error anchor
      });

      try {
        validateRows([messyRow], mockHelpers);
      } catch (error: any) {
        const errorLines = error.message.split('\n');

        // Line 1 is the "Validation failed:" banner, lines 2-11 are the 10 errors
        expect(errorLines.length).toBe(12);
        expect(errorLines[errorLines.length - 1]).toContain('...and 3 more errors.');
      }
    });
  });
});
