import { PrismaService } from '@/prisma/prisma.service';
import { OnQueueFailed, OnQueueStalled, Process, Processor } from '@nestjs/bull';
import { readExcel } from './excel.reader';
import { validateRows } from './po-import.validator';
import { ImportJobData, PoExcelRow } from './po-import.types';
import * as fs from 'fs';
import Decimal from 'decimal.js';
import { Job } from 'bull';
import { logger } from '@/common/logger/logger';

@Processor('po-imports')
export class PoImportProcessor {
  constructor(private readonly prisma: PrismaService) {}

  @Process('process-excel')
  async handleImport(job: Job<{ historyId: string; filePath: string }>) {
    const { historyId, filePath } = job.data;
    const errors: string[] = [];
    let poSucceeded = 0;
    let poFailed = 0;
    let linesProcessed = 0;

    try {
      const rawRows = readExcel(filePath);
      const validRows = validateRows(rawRows);
      const grouped = this.groupRows(validRows);

      const poTypes = await this.prisma.poType.findMany();
      const poTypeMap = new Map(poTypes.map((t) => [t.code, t.id]));

      for (const [duid, poMap] of grouped.entries()) {
        for (const [poNumber, lines] of poMap.entries()) {
          try {
            await this.prisma.$transaction(
              async (tx) => {
                const header = lines[0];

                // 1. Update the PARENT (PurchaseOrder)
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

                // 2. Update the CHILDREN (PurchaseOrderLine)
                for (const line of lines) {
                  const poTypeId = poTypeMap.get(line.poType?.trim().toUpperCase().replace(/\s+/g, '_') || '');
                  if (!poTypeId) throw new Error(`Unknown PO Type: ${line.poType}`);

                  // Calculate financial totals
                  const unitPrice = new Decimal(line.unitPrice || 0);
                  const qty = new Decimal(line.requestedQuantity || 0);

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
                      poIssuedDate: line.poIssuedDate,
                      itemDescription: line.itemDescription,
                      itemCode: String(line.itemCode),
                      unitPrice,
                      requestedQuantity: qty.toNumber(),
                      poLineAmount: unitPrice.mul(qty),
                      allowedOpenDays: line.allowedOpenDays,
                    },
                    create: {
                      purchaseOrderId: po.id,
                      poLineNumber: String(line.poLineNumber),
                      pm: line.pm,
                      pmId: line.pmId,
                      poIssuedDate: line.poIssuedDate,
                      poTypeId,
                      itemCode: String(line.itemCode),
                      itemDescription: line.itemDescription,
                      unitPrice,
                      requestedQuantity: qty.toNumber(),
                      poLineAmount: unitPrice.mul(qty),
                      allowedOpenDays: line.allowedOpenDays,
                    },
                  });
                  linesProcessed++;
                }
              },
              { timeout: 20000 },
            ); // Slightly longer timeout for bulk lines
            poSucceeded++;
          } catch (err: unknown) {
            poFailed++;
            const message = err instanceof Error ? err.message : 'Unknown transaction error';
            errors.push(`PO ${poNumber} (DUID ${duid}): ${message}`);
          }
        }
      }

      // 4. Update History (Success/Partial/Failed)
      await this.prisma.poImportHistory.updateMany({
        // Use updateMany here
        where: { id: historyId },
        data: {
          status: poFailed === 0 ? 'SUCCESS' : poSucceeded > 0 ? 'PARTIAL' : 'FAILED',
          duidCount: grouped.size,
          poCount: poSucceeded + poFailed,
          poLineCount: linesProcessed,
          errors: errors.slice(0, 50),
        },
      });
    } catch (globalErr: unknown) {
      const message = globalErr instanceof Error ? globalErr.message : 'Unknown global error';
      await this.prisma.poImportHistory.updateMany({
        // And use updateMany here
        where: { id: historyId },
        data: { status: 'FAILED', errors: [message] },
      });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  @OnQueueFailed()
  async handleJobFailure(job: Job<ImportJobData>, error: Error) {
    const { historyId } = job.data;
    logger.error(`Job ${job.id} failed: ${error.message}`);

    await this.prisma.poImportHistory.updateMany({
      // <-- Change to updateMany
      where: { id: historyId },
      data: {
        status: 'FAILED',
        errors: [`Queue Error: ${error.message}`],
      },
    });
  }

  @OnQueueStalled()
  async handleJobStalled(job: Job<ImportJobData>) {
    const { historyId } = job.data;
    logger.warn(`Job ${job.id} stalled!`);

    await this.prisma.poImportHistory.updateMany({
      // <-- Change to updateMany
      where: { id: historyId },
      data: {
        status: 'FAILED',
        errors: ['Job stalled (server restart or timeout)'],
      },
    });
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
