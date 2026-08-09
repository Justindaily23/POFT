import { PrismaService } from '@/prisma/prisma.service';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { readExcel } from './excel.reader';
import { validateRows } from './po-import.validator';
import { ImportJobData, PoExcelRow, ValidationHelpers } from './interfaces/po-import.interface';
import Decimal from 'decimal.js';
import { Job } from 'bullmq';
import { logger } from '@/common/logger/logger';
import { PoLineFinancialService } from '@/common/financial/po-line-financial.service';

@Processor('po-imports')
export class PoImportProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialService: PoLineFinancialService,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { historyId, fileBuffer, fileName } = job.data;
    let poSucceeded = 0;
    let linesProcessed = 0;
    const touchedLineIds: string[] = []; // 🔧 collect lines to reconcile after the transaction

    try {
      const buffer = Buffer.from(fileBuffer, 'base64');
      const rawRows = readExcel(buffer, fileName);

      let poTypes;
      let pmIds;
      try {
        poTypes = await this.prisma.poType.findMany();
        pmIds = await this.prisma.staffProfile.findMany({ select: { staffId: true } });
      } catch (dbLookupError) {
        throw new Error('System Error: Failed to load validation metadata');
      }

      const validationHelpers: ValidationHelpers = {
        validPoTypeCodes: new Set(poTypes.map((t) => t.code.trim())),
        validPmIds: new Set(pmIds.map((pm) => pm.staffId.trim())),
      };

      const validRows = validateRows(rawRows, validationHelpers);
      const grouped = this.groupRows(validRows);
      const poTypeMap = new Map(poTypes.map((t) => [t.code, t.id]));

      // 🔧 PHASE 1: Transaction now only does structural writes (PO + PO line upserts).
      // Financial reconciliation moved OUT of the transaction — see Phase 2 below.
      // This is what was blowing past the 60s limit: 5 extra queries per line for
      // reconciliation, run sequentially inside one long-held transaction.
      const txStart = Date.now();
      await this.prisma.$transaction(
        async (tx) => {
          for (const [duid, poMap] of grouped.entries()) {
            for (const [poNumber, lines] of poMap.entries()) {
              const header = lines[0];

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

              for (const line of lines) {
                const poType = poTypeMap.get(line.poType?.trim().toUpperCase().replace(/\s+/g, '_') || '');
                if (!poType) {
                  throw new Error(`PO ${poNumber} (DUID ${duid}): Unknown PO Type: ${line.poType}`);
                }

                const unitPrice = new Decimal(line.unitPrice || 0);
                const qty = new Decimal(line.requestedQuantity || 0);

                const lineRecord = await tx.purchaseOrderLine.upsert({
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
                    poTypeId: poType,
                    itemCode: String(line.itemCode),
                    itemDescription: line.itemDescription,
                    unitPrice,
                    requestedQuantity: qty.toNumber(),
                    poLineAmount: unitPrice.mul(qty),
                    allowedOpenDays: line.allowedOpenDays,
                  },
                });

                touchedLineIds.push(lineRecord.id); // 🔧 no reconcile call here anymore
                linesProcessed++;
              }
              poSucceeded++;
            }
          }
        },
        { timeout: 120000 }, // 🔧 raised as a safety margin, on top of the Phase 1/2 split
      );
      logger.info(`Structural transaction completed in ${Date.now() - txStart}ms`, { historyId, lineCount: linesProcessed });

      // 🔧 PHASE 2: Batched financial reconciliation, OUTSIDE the transaction.
      // Every touched line still gets synced to real FundRequest data —
      // just via 2 queries total instead of 5 queries × number of lines.
      const reconcileStart = Date.now();
      await this.financialService.reconcileManyPoLines(touchedLineIds);
      logger.info(`Financial reconciliation completed in ${Date.now() - reconcileStart}ms`, { historyId, lineCount: touchedLineIds.length });

      await this.prisma.poImportHistory.update({
        where: { id: historyId },
        data: {
          status: 'SUCCESS',
          duidCount: grouped.size,
          poCount: poSucceeded,
          poLineCount: linesProcessed,
          errors: [],
        },
      });
    } catch (globalErr: unknown) {
      let message = 'Purchase Order Processing failed due to an unexpected system error.';

      if (globalErr instanceof Error) {
        const nestErr = globalErr as any;

        if (nestErr.response?.message) {
          message = Array.isArray(nestErr.response.message)
            ? nestErr.response.message.join('\n')
            : nestErr.response.message;
        } else if (
          globalErr.message.includes('Transaction API error') ||
          globalErr.message.includes('expired transaction')
        ) {
          message =
            'This file took too long to process and the operation timed out. Try splitting it into a smaller file, or contact support if this keeps happening.';
        } else {
          message = globalErr.message;
        }
      } else {
        message = String(globalErr);
      }
      logger.error('Import failed and rolled back completely', { historyId, errorMessage: message });

      const cleanedErrorLines = message
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      await this.prisma.poImportHistory.update({
        where: { id: historyId },
        data: {
          status: 'FAILED',
          errors: cleanedErrorLines,
        },
      });

      throw new Error(`Import script terminated: ${cleanedErrorLines[0] || 'Database connection aborted'}`);
    }
  }

  @OnWorkerEvent('failed')
  async handleJobFailure(job: Job, error: Error) {
    const { historyId } = job.data;
    logger.error(`Job ${job.id} failed: ${error.message}`);
    await this.prisma.poImportHistory.updateMany({
      where: { id: historyId, status: 'PENDING' },
      data: { status: 'FAILED', errors: [`Queue Error: ${error.message}`] },
    });
  }

  @OnWorkerEvent('stalled')
  async handleJobStalled(jobId: string) {
    logger.warn(`Job ${jobId} stalled!`);
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