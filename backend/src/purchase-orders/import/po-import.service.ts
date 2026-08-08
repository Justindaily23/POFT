import { Injectable, BadRequestException, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import { ImportResult, PoImportStatus } from './interfaces/po-import.interface';
import { PoImportHistory } from '@prisma/client';

@Injectable()
export class PoImportService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('po-imports') private readonly importQueue: Queue,
  ) {}

  async onModuleInit() {
    if (this.importQueue && typeof this.importQueue.clean === 'function') {
      await this.importQueue.clean(0, 1000, 'failed');
    }
  }

  async importFromExcel(file: Express.Multer.File, userId?: string) {
    // 1. Hash the file to generate a unique digital fingerprint
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');

    // 2. Prevent duplicating an import that worked completely before
    const existingSuccess = await this.prisma.poImportHistory.findFirst({
      where: { fileHash, status: 'SUCCESS' },
    });

    if (existingSuccess) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
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

    // 4. Offload processing securely to the BullMQ Redis sandbox
    await this.importQueue.add(
      'process-excel',
      {
        historyId: history.id,
        filePath: file.path,
      },
      {
        attempts: 3,
        // Exponential backoff: retry after 5s, then 10s, then 20s if the database locks up
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return {
      historyId: history.id,
      status: 'PENDING',
      duidCount: 0,
      poSucceeded: 0,
      linesProcessed: 0,
      errors: [],
    };
  }

  // async getImportHistoryById(id: string) {
  //   return this.prisma.poImportHistory.findUnique({
  //     where: { id },
  //   });
  // }

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
