import { Injectable, BadRequestException, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImportResult, PoImportStatus } from './interfaces/po-import.interface';
import { PoImportHistory } from '@prisma/client';
import { logger } from 'src/common/logger/logger';

@Injectable()
export class PoImportService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('po-imports') private readonly importQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      if (this.importQueue && typeof this.importQueue.clean === 'function') {
        await this.importQueue.clean(0, 1000, 'failed');
        logger.info('BullMQ "po-imports" failed jobs queue flushed cleanly on startup');
      }
    } catch (err: unknown) {
      logger.error('Failed to clean BullMQ failed jobs queue on application initialization', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async importFromExcel(file: Express.Multer.File, userId?: string) {
    // 1. Hash the file to generate a unique digital fingerprint
    // const fileBuffer = fs.readFileSync(file.path);
    const fileHash = createHash('md5').update(file.buffer).digest('hex');

    // 2. Prevent duplicating an import that worked completely before
    const existingSuccess = await this.prisma.poImportHistory.findFirst({
      where: { fileHash, status: 'SUCCESS' },
    });

    if (existingSuccess) {
      logger.warn(`File upload rejected: Duplicate hash found for file ${file.originalname}`, { userId, fileHash });
      throw new BadRequestException(`File already imported on ${existingSuccess.createdAt.toDateString()}`);
    }

    // 3. Create or reset the tracking ticket in PENDING status
    const history = await this.prisma.poImportHistory.upsert({
      where: { fileHash },
      update: {
        status: 'PENDING',
        fileName: file.originalname,
        duidCount: 0,
        poCount: 0,
        poLineCount: 0,
        errors: [], // Resets error logs for a fresh attempt
      },
      create: {
        fileName: file.originalname,
        fileHash,
        status: 'PENDING',
        createdBy: userId,
        duidCount: 0,
        poCount: 0,
        poLineCount: 0,
      },
    });

    // 4. Convert memory buffer to a safe JSON-serializable base64 string for BullMQ Redis
    const fileBase64 = file.buffer.toString('base64');

    // 5. Offload processing securely to the BullMQ Redis sandbox
    try {
      await this.importQueue.add(
        'process-excel',
        {
          historyId: history.id,
          fileBuffer: fileBase64,
          fileName: file.originalname,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      // MILESTONE LOGGING: Confirms file is safely tracking down the background pipeline
      logger.info(`Excel file "${file.originalname}" enqueued successfully for background processing`, {
        historyId: history.id,
        userId,
      });
    } catch (queueError: unknown) {
      //Instantly flags database/Redis memory or cluster timeouts
      logger.error(`Failed to hand off Excel file processing to BullMQ Redis sandbox`, {
        historyId: history.id,
        fileName: file.originalname,
        error: queueError instanceof Error ? queueError.message : String(queueError),
      });

      // Update the ticket to FAILED so the UI doesn't spin on PENDING forever
      await this.prisma.poImportHistory
        .update({
          where: { id: history.id },
          data: { status: 'FAILED', errors: ['Internal queue engine connection error'] },
        })
        .catch(() => undefined); // Silent catch in case database itself is down

      throw new BadRequestException('Currently unavailable. Please try again shortly.');
    }

    return {
      historyId: history.id,
      status: 'PENDING',
      duidCount: 0,
      poSucceeded: 0,
      linesProcessed: 0,
      errors: [],
    };
  }

  async getImportStatus(id: string): Promise<ImportResult> {
    const history = await this.prisma.poImportHistory.findUnique({ where: { id } });
    if (!history) throw new NotFoundException('Import history not found');

    const errorList = Array.isArray(history.errors) ? (history.errors as string[]) : [];

    return {
      historyId: history.id,
      // ✅ Fix: Properly allow 'PENDING' state to be returned securely
      status: history.status as PoImportStatus,
      duidCount: history.duidCount,
      poSucceeded: history.poCount - errorList.length,
      linesProcessed: history.poLineCount,
      errors: errorList,
    };
  }

  async getImportHistory(limitStr?: string, status?: string): Promise<PoImportHistory[]> {
    // Parse defaults securely down here
    const parsedLimit = limitStr ? parseInt(limitStr, 10) : 50;
    const take = isNaN(parsedLimit) ? 50 : parsedLimit;

    return await this.prisma.poImportHistory.findMany({
      where: status ? { status: status as PoImportStatus } : {},
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
