import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as fs from 'fs';

@Injectable()
export class PoImportService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('po-imports') private readonly importQueue: Queue, // Inject your queue
  ) {}

  async onModuleInit() {
    if (this.importQueue && typeof this.importQueue.clean === 'function') {
      await this.importQueue.clean(0, 'failed');
      await this.importQueue.clean(0, 'wait');
    }
  }

  async importFromExcel(file: Express.Multer.File, userId?: string) {
    // 1. Hash the file
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');

    // 2. Check for SUCCESS (Only block if it actually finished before)
    const existingSuccess = await this.prisma.poImportHistory.findFirst({
      where: { fileHash, status: 'SUCCESS' },
    });

    if (existingSuccess) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException(`File already imported on ${existingSuccess.createdAt.toDateString()}`);
    }

    // 3. UPSERT the placeholder (This prevents the Unique Constraint crash)
    const history = await this.prisma.poImportHistory.upsert({
      where: { fileHash },
      update: {
        status: 'PENDING',
        fileName: file.originalname,
        duidCount: 0,
        poCount: 0,
        poLineCount: 0,
        errors: [], // Reset errors for the retry
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

    // 4. Offload to Worker
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

  async getImportHistoryById(id: string) {
    return this.prisma.poImportHistory.findUnique({
      where: { id },
    });
  }
}
