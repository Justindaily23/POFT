import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';
import { createHash } from 'crypto';
import * as fs from 'fs';

import { readExcel } from './excel.reader';
import { validateRows } from './po-import.validator';
import { PoExcelRow } from './po-import.types';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entry point for Excel Import
   */
  async importFromExcel(file: Express.Multer.File, uploadedBy?: string): Promise<ImportResult> {
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');

    // 1. Prevent Double Upload
    const existing = await this.prisma.poImportHistory.findUnique({
      where: { fileHash },
    });
    if (existing && existing.status === 'SUCCESS') {
      // 🗑️ CLEANUP: Delete the file from /uploads before throwing the error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException(
        `This file was already successfully imported on ${existing.createdAt.toLocaleDateString()}`,
      );
    }

    // 2. Parse & Validate
    let rawRows: PoExcelRow[];
    try {
      rawRows = readExcel(file.path);
      if (!rawRows.length) throw new Error('Excel file appears to be empty.');
    } catch (e: any) {
      throw new BadRequestException(`Excel Parsing Error: ${e.message}`);
    }

    const validRows = validateRows(rawRows);
    const grouped = this.groupRows(validRows);

    // 3. Cache PO Types for performance (prevents 1000+ DB hits)
    const poTypes = await this.prisma.poType.findMany();
    const poTypeMap = new Map(poTypes.map((t) => [t.code.toUpperCase(), t.id]));

    const errors: string[] = [];
    let poSucceeded = 0;
    let poFailed = 0;
    let linesProcessed = 0;

    // 4. Process Groups (Partial Success Logic)
    for (const [duid, poMap] of grouped.entries()) {
      for (const [poNumber, lines] of poMap.entries()) {
        try {
          // We use a mini-transaction per PO (header + its lines)
          await this.prisma.$transaction(
            async (tx) => {
              const header = lines[0];

              // Upsert Header
              const po = await tx.purchaseOrder.upsert({
                where: { duid_poNumber: { duid, poNumber } },
                update: {
                  projectName: header.projectName,
                  projectCode: header.projectCode,
                  prNumber: header.prNumber,
                },
                create: {
                  duid,
                  poNumber,
                  projectName: header.projectName,
                  projectCode: header.projectCode,
                  prNumber: header.prNumber,
                },
              });

              // Process Lines
              for (const line of lines) {
                const formattedCode = line.poType?.trim().toUpperCase().replace(/\s+/g, '_') || '';
                const poTypeId = poTypeMap.get(formattedCode);

                if (!poTypeId) {
                  errors.push(`PO ${poNumber} (DUID: ${duid}): Unknown PO Type: ${line.poType}`);
                  poFailed++; // Increment failed count
                  continue; // Skip this line or handle as error
                }

                const unitPrice = new Decimal(line.unitPrice || 0);
                const qty = new Decimal(line.requestedQuantity || 0);
                const lineAmount = unitPrice.mul(qty);

                // Ensure we have a valid Date object for Prisma
                const dbDate = line.poIssuedDate instanceof Date ? line.poIssuedDate : new Date(line.poIssuedDate);

                await tx.purchaseOrderLine.upsert({
                  where: {
                    purchaseOrderId_poLineNumber: {
                      purchaseOrderId: po.id,
                      poLineNumber: String(line.poLineNumber),
                    },
                  },
                  update: {
                    pm: line.pm,
                    pmId: line.pmId,
                    poIssuedDate: dbDate,
                    itemDescription: line.itemDescription,
                    itemCode: String(line.itemCode),
                    unitPrice,
                    requestedQuantity: qty.toNumber(),
                    poLineAmount: lineAmount,
                    allowedOpenDays: line.allowedOpenDays,
                  },
                  create: {
                    purchaseOrderId: po.id,
                    poLineNumber: String(line.poLineNumber),
                    pm: line.pm,
                    pmId: line.pmId,
                    poIssuedDate: dbDate,
                    poTypeId,
                    itemCode: String(line.itemCode),
                    itemDescription: line.itemDescription,
                    unitPrice,
                    requestedQuantity: qty.toNumber(),
                    poLineAmount: lineAmount,
                    allowedOpenDays: line.allowedOpenDays,
                  },
                });
                linesProcessed++;
              }
            },
            {
              timeout: 15000, // Give each PO 15 seconds to process its lines
            },
          );
          poSucceeded++;
        } catch (err: any) {
          poFailed++;
          errors.push(`PO ${poNumber} (DUID: ${duid}): ${err.message}`);
        }
      }
    }

    // 5. Final Status
    const finalStatus = poFailed === 0 ? 'SUCCESS' : poSucceeded > 0 ? 'PARTIAL' : 'FAILED';

    // 6. Record History
    const history = await this.prisma.poImportHistory.create({
      data: {
        fileName: file.originalname,
        fileHash,
        duidCount: grouped.size,
        poCount: poSucceeded + poFailed,
        poLineCount: linesProcessed,
        status: finalStatus,
        errors: errors.length ? errors : undefined,
        createdBy: uploadedBy,
      },
    });

    return {
      historyId: history.id,
      duidCount: grouped.size,
      poSucceeded,
      poFailed,
      linesProcessed,
      status: finalStatus as any,
      errors: errors.slice(0, 50), // Cap errors sent to UI for performance
    };
  }

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
}
