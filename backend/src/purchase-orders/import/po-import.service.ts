import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as fs from 'fs';

export interface ImportResult {
  historyId: string;
  duidCount: number;
  poSucceeded: number;
  poFailed: number;
  linesProcessed: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errors: string[];
}

@Injectable()
export class PoImportService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('po-imports') private readonly importQueue: Queue, // Inject your queue
  ) {}

  async importFromExcel(file: Express.Multer.File, userId?: string) {
    // 1. Efficiently hash the file
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');

    // 2. Prevent double-imports
    const existing = await this.prisma.poImportHistory.findUnique({
      where: { fileHash },
    });

    if (existing && existing.status === 'SUCCESS') {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException(`File already imported on ${existing.createdAt.toDateString()}`);
    }

    // 3. Create a "PENDING" placeholder for the Admin to track
    const history = await this.prisma.poImportHistory.create({
      data: {
        fileName: file.originalname,
        fileHash,
        status: 'PENDING',
        createdBy: userId,
        duidCount: 0,
        poCount: 0,
        poLineCount: 0,
      },
    });

    // 4. Offload to Worker - Pass the file PATH, not the buffer
    await this.importQueue.add(
      'process-excel',
      {
        historyId: history.id,
        filePath: file.path,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return {
      message: 'Import started. You can track progress in the History tab.',
      historyId: history.id,
    };
  }
}

// ... imports stay the same

// @Injectable()
// export class PoImportService {
//   constructor(private readonly prisma: PrismaService) {}

//   async importFromExcel(file: Express.Multer.File, uploadedBy?: string): Promise<ImportResult> {
//     const fileBuffer = fs.readFileSync(file.path);
//     const fileHash = createHash('md5').update(fileBuffer).digest('hex');

//     // 1. Prevent Double Upload
//     const existing = await this.prisma.poImportHistory.findUnique({
//       where: { fileHash },
//     });
//     if (existing && existing.status === 'SUCCESS') {
//       if (fs.existsSync(file.path)) {
//         fs.unlinkSync(file.path);
//       }
//       throw new BadRequestException(
//         `This file was already successfully imported on ${existing.createdAt.toLocaleDateString()}`,
//       );
//     }

//     // 2. Parse & Validate
//     let rawRows: PoExcelRow[];
//     try {
//       rawRows = readExcel(file.path);
//       if (!rawRows.length) throw new Error('Excel file appears to be empty.');
//     } catch (e: unknown) {
//       // FIX: Use unknown instead of any
//       const message = e instanceof Error ? e.message : 'Unknown parsing error';
//       throw new BadRequestException(`Excel Parsing Error: ${message}`);
//     }

//     const validRows = validateRows(rawRows);
//     const grouped = this.groupRows(validRows);

//     // 3. Cache PO Types
//     const poTypes = await this.prisma.poType.findMany();
//     const poTypeMap = new Map(poTypes.map((t) => [t.code.toUpperCase(), t.id]));

//     const errors: string[] = [];
//     let poSucceeded = 0;
//     let poFailed = 0;
//     let linesProcessed = 0;

//     // 4. Process Groups
//     for (const [duid, poMap] of grouped.entries()) {
//       for (const [poNumber, lines] of poMap.entries()) {
//         try {
//           await this.prisma.$transaction(
//             async (tx) => {
//               const header = lines[0];

//               const po = await tx.purchaseOrder.upsert({
//                 where: { duid_poNumber: { duid, poNumber } },
//                 update: {
//                   projectName: header.projectName,
//                   projectCode: header.projectCode,
//                   prNumber: header.prNumber,
//                 },
//                 create: {
//                   duid,
//                   poNumber,
//                   projectName: header.projectName,
//                   projectCode: header.projectCode,
//                   prNumber: header.prNumber,
//                 },
//               });

//               for (const line of lines) {
//                 const formattedCode = line.poType?.trim().toUpperCase().replace(/\s+/g, '_') || '';
//                 const poTypeId = poTypeMap.get(formattedCode);

//                 if (!poTypeId) {
//                   errors.push(`PO ${poNumber} (DUID: ${duid}): Unknown PO Type: ${line.poType}`);
//                   poFailed++;
//                   continue;
//                 }

//                 const unitPrice = new Decimal(line.unitPrice || 0);
//                 const qty = new Decimal(line.requestedQuantity || 0);
//                 const lineAmount = unitPrice.mul(qty);
//                 const dbDate = line.poIssuedDate instanceof Date ? line.poIssuedDate : new Date(line.poIssuedDate);

//                 await tx.purchaseOrderLine.upsert({
//                   where: {
//                     purchaseOrderId_poLineNumber: {
//                       purchaseOrderId: po.id,
//                       poLineNumber: String(line.poLineNumber),
//                     },
//                   },
//                   update: {
//                     pm: line.pm,
//                     pmId: line.pmId,
//                     poIssuedDate: dbDate,
//                     itemDescription: line.itemDescription,
//                     itemCode: String(line.itemCode),
//                     unitPrice,
//                     requestedQuantity: qty.toNumber(),
//                     poLineAmount: lineAmount,
//                     allowedOpenDays: line.allowedOpenDays,
//                   },
//                   create: {
//                     purchaseOrderId: po.id,
//                     poLineNumber: String(line.poLineNumber),
//                     pm: line.pm,
//                     pmId: line.pmId,
//                     poIssuedDate: dbDate,
//                     poTypeId,
//                     itemCode: String(line.itemCode),
//                     itemDescription: line.itemDescription,
//                     unitPrice,
//                     requestedQuantity: qty.toNumber(),
//                     poLineAmount: lineAmount,
//                     allowedOpenDays: line.allowedOpenDays,
//                   },
//                 });
//                 linesProcessed++;
//               }
//             },
//             { timeout: 15000 },
//           );
//           poSucceeded++;
//         } catch (err: unknown) {
//           // FIX: Use unknown instead of any
//           poFailed++;
//           const message = err instanceof Error ? err.message : 'Unknown transaction error';
//           errors.push(`PO ${poNumber} (DUID: ${duid}): ${message}`);
//         }
//       }
//     }

//     const finalStatus = poFailed === 0 ? 'SUCCESS' : poSucceeded > 0 ? 'PARTIAL' : 'FAILED';

//     const history = await this.prisma.poImportHistory.create({
//       data: {
//         fileName: file.originalname,
//         fileHash,
//         duidCount: grouped.size,
//         poCount: poSucceeded + poFailed,
//         poLineCount: linesProcessed,
//         status: finalStatus,
//         errors: errors.length ? errors : undefined,
//         createdBy: uploadedBy,
//       },
//     });

//     return {
//       historyId: history.id,
//       duidCount: grouped.size,
//       poSucceeded,
//       poFailed,
//       linesProcessed,
//       status: finalStatus, // FIX: Explicit cast instead of any
//       errors: errors.slice(0, 50),
//     };
//   }

//   private groupRows(rows: PoExcelRow[]) {
//     const grouped = new Map<string, Map<string, PoExcelRow[]>>();
//     for (const row of rows) {
//       if (!grouped.has(row.duid)) grouped.set(row.duid, new Map());
//       const duidMap = grouped.get(row.duid)!;
//       if (!duidMap.has(row.poNumber)) duidMap.set(row.poNumber, []);
//       duidMap.get(row.poNumber)!.push(row);
//     }
//     return grouped;
//   }
// }
