// import { Injectable } from '@nestjs/common';
// import { PoImportHistory } from '@prisma/client';
// import Decimal from 'decimal.js';

// import { readExcel } from './excel.reader';
// import { validateRows } from './po-import.validator';
// import { PoExcelRow } from './po-import.types';
// import { PrismaService } from 'src/prisma/prisma.service';

// export type ImportStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

// export interface ImportResult {
//   duidCount: number;
//   purchaseOrdersCreated: number;
//   poLinesCreated: number;
//   status: ImportStatus;
//   errors: string[];
// }

// @Injectable()
// export class PoImportService {
//   constructor(private readonly prisma: PrismaService) {}

//   // ------------------- DATE PARSING HELPER -------------------

//   /**
//    * Converts Excel string to Date, logs error if invalid
//    */
//   private parseDate(value: string | number, poNumber: string, duid: string, errors: string[]): Date {
//     // Case 1: Excel serial number
//     if (typeof value === 'number') {
//       const excelEpoch = new Date(1899, 11, 30);
//       return new Date(excelEpoch.getTime() + value * 86400000);
//     }

//     // Case 2: dd/mm/yyyy
//     const parts = value.split('/');
//     if (parts.length === 3) {
//       const [day, month, year] = parts.map(Number);
//       const date = new Date(year, month - 1, day);
//       if (!isNaN(date.getTime())) return date;
//     }

//     errors.push(`Invalid poIssuedDate for PO ${poNumber} in DUID ${duid}: "${value}"`);
//     return new Date(); // fallback
//   }

//   // --------------------- PRIVATE HELPERS ---------------------

//   /**
//    * Groups Excel rows by DUID → PO Number → PO Lines
//    */
//   private groupRows(rows: PoExcelRow[]): Record<string, Record<string, PoExcelRow[]>> {
//     const grouped: Record<string, Record<string, PoExcelRow[]>> = {};

//     for (const row of rows) {
//       if (!grouped[row.duid]) grouped[row.duid] = {};
//       if (!grouped[row.duid][row.poNumber]) grouped[row.duid][row.poNumber] = [];
//       grouped[row.duid][row.poNumber].push(row);
//     }

//     return grouped;
//   }

//   /**
//    * Saves import summary in PoImportHistory table
//    */
//   private async recordImportHistory(
//     fileName: string,
//     duidCount: number,
//     poCount: number,
//     poLineCount: number,
//     status: ImportStatus,
//     errors?: string[],
//     createdBy?: string,
//   ): Promise<PoImportHistory> {
//     return this.prisma.poImportHistory.create({
//       data: {
//         fileName,
//         duidCount,
//         poCount,
//         poLineCount,
//         status,
//         errors,
//         createdBy,
//       },
//     });
//   }
//   //================================================================
//   /**
//    * Main entry: imports PO data from an Excel file
//    * @param filePath path to Excel file
//    * @param uploadedBy optional user ID performing the import
//    */
//   async importFromExcel(file: Express.Multer.File, uploadedBy?: string): Promise<ImportResult> {
//     const filePath = file.path; // Multer saved path
//     const fileName = file.originalname; // for audit/history

//     let rows: PoExcelRow[] = [];
//     const errors: string[] = [];
//     let status: ImportStatus = 'SUCCESS';

//     // 1️⃣ Read & validate
//     try {
//       const rawRows = readExcel(filePath) as PoExcelRow[];

//       rows = validateRows(rawRows);
//     } catch (e: any) {
//       status = 'FAILED';
//       errors.push(e.message);
//       await this.recordImportHistory(
//         fileName, //
//         0,
//         0,
//         0,
//         status,
//         errors,
//         uploadedBy,
//       );

//       throw new Error(`Import validation failed`, { cause: e });
//     }

//     // 2️⃣ Group PO Lines → PO Numbers → DUIDs
//     const grouped = this.groupRows(rows);

//     let duidCount = Object.keys(grouped).length;
//     let poCount = 0;
//     let poLinesCount = 0;

//     // 3️⃣ Iterate through grouped data
//     for (const [duid, poMap] of Object.entries(grouped)) {
//       for (const [poNumber, lines] of Object.entries(poMap)) {
//         const header = lines[0];

//         //normalize strings to match database before loook up
//         const normalizedPoType = header.poType?.trim().toUpperCase();

//         // ✅ Lookup PO Type
//         const poType = await this.prisma.poType.findUnique({
//           where: { code: normalizedPoType },
//         });

//         if (!poType) {
//           errors.push(`POType not found for PO ${poNumber} in DUID ${duid}`);
//           status = 'PARTIAL';
//           continue; // skip this PO
//         }

//         // ✅ Idempotency: skip if already exists
//         const exists = await this.prisma.purchaseOrder.findFirst({
//           where: { duid, poNumber },
//         });
//         if (exists) {
//           errors.push(`Duplicate PO skipped: ${poNumber} for DUID ${duid}`);
//           status = 'PARTIAL';
//           continue;
//         }

//         // ✅ Transactional insert per PO
//         try {
//           await this.prisma.$transaction(async (tx) => {
//             await tx.purchaseOrder.create({
//               data: {
//                 duid,
//                 poNumber,
//                 projectName: header.projectName,
//                 projectCode: header.projectCode,
//                 prNumber: header.prNumber,
//                 poIssuedDate: this.parseDate(header.poIssuedDate, poNumber, duid, errors),
//                 pm: header.pm,
//                 poLines: {
//                   create: lines.map((line) => ({
//                     poLineNumber: String(line.poLineNumber), // convert number → string
//                     poTypeId: poType.id,
//                     itemCode: String(line.itemCode), // convert number → string
//                     itemDescription: line.itemDescription,
//                     unitPrice: new Decimal(line.unitPrice),
//                     requestedQuantity: Number(line.requestedQuantity),
//                     poLineAmount: new Decimal(line.unitPrice * line.requestedQuantity),
//                   })),
//                 },
//               },
//             });
//           });
//           poCount++;
//           poLinesCount += lines.length;
//         } catch (txError: any) {
//           errors.push(`Failed to insert PO ${poNumber} in DUID ${duid}: ${txError.message}`);
//           status = 'PARTIAL';
//         }
//       }
//     }

//     // 4️⃣ Record Import History
//     await this.recordImportHistory(
//       fileName,
//       duidCount,
//       poCount,
//       poLinesCount,
//       status,
//       errors.length ? errors : undefined,
//       uploadedBy,
//     );

//     // 5️⃣ Return structured summary
//     return {
//       duidCount,
//       purchaseOrdersCreated: poCount,
//       poLinesCreated: poLinesCount,
//       status,
//       errors,
//     };
//   }
// }

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Decimal from 'decimal.js';

import { readExcel } from './excel.reader';
import { validateRows } from './po-import.validator';
import { PoExcelRow } from './po-import.types';

export type ImportStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface ImportResult {
  duidCount: number;
  poSucceeded: number;
  poFailed: number;
  linesCreated: number;
  linesUpdated: number;
  status: ImportStatus;
  errors: string[];
}

@Injectable()
export class PoImportService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------- */
  /* Date parsing (SAFE)                */
  /* ---------------------------------- */
  private parseDate(value: string | number | undefined, poNumber: string, duid: string, errors: string[]): Date | null {
    if (!value) return null;

    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + value * 86400000);
    }

    if (typeof value === 'string' && value.includes('/')) {
      const [d, m, y] = value.split('/').map(Number);
      const parsed = new Date(y, m - 1, d);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    errors.push(`Invalid date for PO ${poNumber} (${duid}): "${value}". Stored as NULL.`);
    return null;
  }

  /* ---------------------------------- */
  /* Group rows                         */
  /* ---------------------------------- */
  private groupRows(rows: PoExcelRow[]) {
    const grouped = new Map<string, Map<string, PoExcelRow[]>>();

    for (const row of rows) {
      if (!grouped.has(row.duid)) grouped.set(row.duid, new Map());
      const duidMap = grouped.get(row.duid)!;

      if (!duidMap.has(row.poNumber)) duidMap.set(row.poNumber, []);
      duidMap.get(row.poNumber)!.push(row);
    }

    return grouped;
  }

  /* ---------------------------------- */
  /* Detect duplicates INSIDE Excel     */
  /* ---------------------------------- */
  private detectInternalDuplicates(rows: PoExcelRow[]) {
    const seen = new Set<string>();

    for (const r of rows) {
      const key = `${r.duid}|${r.poNumber}|${r.poLineNumber}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate PO line in Excel: DUID=${r.duid}, PO=${r.poNumber}, Line=${r.poLineNumber}`,
        );
      }
      seen.add(key);
    }
  }

  /* ---------------------------------- */
  /* Main import                        */
  /* ---------------------------------- */
  async importFromExcel(file: Express.Multer.File, uploadedBy?: string): Promise<ImportResult> {
    const errors: string[] = [];
    let rawRows: PoExcelRow[];

    try {
      rawRows = readExcel(file.path) as PoExcelRow[];
      if (!rawRows.length) throw new Error('Excel file is empty');
    } catch (e: any) {
      await this.recordHistory(file.originalname, 0, 0, 0, 0, 'FAILED', [e.message], uploadedBy);
      throw new BadRequestException(e.message);
    }

    const validRows = validateRows(rawRows);
    this.detectInternalDuplicates(validRows);

    const grouped = this.groupRows(validRows);

    // Cache reference data
    const poTypes = await this.prisma.poType.findMany();
    const poTypeMap = new Map(poTypes.map((t) => [t.code.toUpperCase(), t.id]));

    let poSucceeded = 0;
    let poFailed = 0;
    let linesCreated = 0;
    let linesUpdated = 0;

    /* ---------------------------------- */
    /* FILE-ATOMIC TRANSACTION            */
    /* ---------------------------------- */
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const [duid, poMap] of grouped.entries()) {
          for (const [poNumber, lines] of poMap.entries()) {
            const header = lines[0];
            const poTypeId = poTypeMap.get(header.poType?.trim().toUpperCase() || '');

            if (!poTypeId) {
              throw new Error(`Invalid PO Type "${header.poType}" for PO ${poNumber}`);
            }

            const po = await tx.purchaseOrder.upsert({
              where: { duid_poNumber: { duid, poNumber } },
              update: {
                projectName: header.projectName,
                projectCode: header.projectCode,
                pm: header.pm,
                prNumber: header.prNumber,
              },
              create: {
                duid,
                poNumber,
                projectName: header.projectName,
                projectCode: header.projectCode,
                pm: header.pm,
                prNumber: header.prNumber,
                poIssuedDate: this.parseDate(header.poIssuedDate, poNumber, duid, errors),
              },
            });

            for (const line of lines) {
              const unitPrice = new Decimal(line.unitPrice || 0);
              const qty = new Decimal(line.requestedQuantity || 0);
              const lineAmount = unitPrice.mul(qty);

              const existing = await tx.purchaseOrderLine.findUnique({
                where: {
                  purchaseOrderId_poLineNumber: {
                    purchaseOrderId: po.id,
                    poLineNumber: String(line.poLineNumber),
                  },
                },
              });

              await tx.purchaseOrderLine.upsert({
                where: {
                  purchaseOrderId_poLineNumber: {
                    purchaseOrderId: po.id,
                    poLineNumber: String(line.poLineNumber),
                  },
                },
                update: {
                  itemDescription: line.itemDescription,
                  itemCode: String(line.itemCode),
                  unitPrice,
                  requestedQuantity: qty.toNumber(),
                  poLineAmount: lineAmount,
                  // 🔒 contractAmount intentionally NOT touched
                },
                create: {
                  purchaseOrderId: po.id,
                  poLineNumber: String(line.poLineNumber),
                  poTypeId,
                  itemCode: String(line.itemCode),
                  itemDescription: line.itemDescription,
                  unitPrice,
                  requestedQuantity: qty.toNumber(),
                  poLineAmount: lineAmount,
                  contractAmount: lineAmount, // ✅ system-derived
                  totalApprovedAmount: new Decimal(0),
                },
              });

              existing ? linesUpdated++ : linesCreated++;
            }

            poSucceeded++;
          }
        }
      });
    } catch (e: any) {
      errors.push(e.message);
      poFailed = poSucceeded;
      poSucceeded = 0;

      await this.recordHistory(file.originalname, grouped.size, 0, 0, 0, 'FAILED', errors, uploadedBy);

      throw new BadRequestException(e.message);
    }

    await this.recordHistory(
      file.originalname,
      grouped.size,
      poSucceeded,
      linesCreated,
      linesUpdated,
      'SUCCESS',
      errors,
      uploadedBy,
    );

    return {
      duidCount: grouped.size,
      poSucceeded,
      poFailed,
      linesCreated,
      linesUpdated,
      status: errors.length ? 'PARTIAL' : 'SUCCESS',
      errors,
    };
  }

  /* ---------------------------------- */
  /* Import history                     */
  /* ---------------------------------- */
  private async recordHistory(
    fileName: string,
    duidCount: number,
    poCount: number,
    linesCreated: number,
    linesUpdated: number,
    status: ImportStatus,
    errors: string[],
    createdBy?: string,
  ) {
    return this.prisma.poImportHistory.create({
      data: {
        fileName,
        duidCount,
        poCount,
        poLineCount: linesCreated + linesUpdated,
        status,
        errors: errors.length ? errors.slice(0, 50) : undefined,
        createdBy,
      },
    });
  }
}
