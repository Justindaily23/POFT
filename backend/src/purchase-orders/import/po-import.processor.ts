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
    // let poFailed = 0;
    let linesProcessed = 0;

    try {
      const buffer = Buffer.from(fileBuffer, 'base64');
      const rawRows = readExcel(buffer, fileName);

      let poTypes;
      let pmIds;
      try {
        poTypes = await this.prisma.poType.findMany();
        pmIds = await this.prisma.staffProfile.findMany({ select: { staffId: true } });
      } catch (dbLookupError) {
        // ✅ Normalized string matches the test suite expectations exactly
        throw new Error('System Error: Failed to load validation metadata');
      }

      const validationHelpers: ValidationHelpers = {
        validPoTypeCodes: new Set(poTypes.map((t) => t.code.trim())),
        validPmIds: new Set(pmIds.map((pm) => pm.staffId.trim())),
      };

      const validRows = validateRows(rawRows, validationHelpers);

      // Group the flat arrays of data into the expected nesting where DUID has PONumbers and PONumbers have lines.
      const grouped = this.groupRows(validRows);
      const poTypeMap = new Map(poTypes.map((t) => [t.code, t.id]));

      //  Open one single global transaction for the ENTIRE file so that the whole process fails and rolls back completely
      // should any error occur to avoid corrupt data or incomplete data
      await this.prisma.$transaction(
        async (tx) => {
          // Loop through grouped data
          for (const [duid, poMap] of grouped.entries()) {
            for (const [poNumber, lines] of poMap.entries()) {
              const header = lines[0];

              // Upsert the parent Purchase Order Header using
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

              // Loop through individual purchase order lines
              for (const line of lines) {
                const poType = poTypeMap.get(line.poType?.trim().toUpperCase().replace(/\s+/g, '_') || '');
                if (!poType) {
                  // Throwing an error here immediately terminates and rolls back EVERYTHING
                  throw new Error(`PO ${poNumber} (DUID ${duid}): Unknown PO Type: ${line.poType}`);
                }

                // High-precision math calculations using Decimal.js
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

                // Downstream financial reconciliation hook using the transaction client
                await this.financialService.reconcilePoLineFinancials(tx, lineRecord.id);
                linesProcessed++;
              }
              // Increment header count safely
              poSucceeded++;
            }
          }
        },
        { timeout: 60000 }, // Increased timeout! Processing an entire file takes longer than a single PO
      );

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
        } else {
          // 🚀 CRITICAL FIX: Isolate the raw error message string explicitly.
          // This detaches complex Node network socket instances so they never crash JSON stringification layers.
          message = globalErr.message;
        }
      } else {
        message = String(globalErr);
      }

      logger.error('Import failed and rolled back completely', { historyId, errorMessage: message });

      // ✅ 2. Cleanly split the single massive string block into a real array of strings
      // This removes the raw "\n" marks so your frontend list maps perfectly.
      const cleanedErrorLines = message
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // ✅ 3. Update your tracking table with a real structured array
      await this.prisma.poImportHistory.update({
        where: { id: historyId },
        data: {
          status: 'FAILED',
          errors: cleanedErrorLines,
        },
      });

      // This tells the queue engine the task officially failed without passing it circular references.
      throw new Error(`Import script terminated: ${cleanedErrorLines[0] || 'Database connection aborted'}`);
    } finally {
    }
  }

  @OnWorkerEvent('failed')
  async handleJobFailure(job: Job, error: Error) {
    const { historyId } = job.data;
    logger.error(`Job ${job.id} failed: ${error.message}`);
    await this.prisma.poImportHistory.updateMany({
      where: { id: historyId },
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
