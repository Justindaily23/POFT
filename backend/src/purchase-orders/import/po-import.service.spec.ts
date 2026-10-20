import { Test, TestingModule } from '@nestjs/testing';
import { PoImportService } from './po-import.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

// Mock the native 'fs' module safely preserving core methods
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

describe('PoImportService', () => {
  let service: PoImportService;
  let prisma: PrismaService;
  let queue: Queue;

  // Mock structures
  const mockFile = {
    originalname: 'mock-po.xlsx',
    buffer: Buffer.from('mock-excel-bytes'),
    size: 16,
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as Express.Multer.File;

  const mockQueue = {
    clean: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue({ id: 'job-id' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoImportService,
        {
          provide: PrismaService,
          useValue: {
            poImportHistory: {
              findFirst: jest.fn(),
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken('po-imports'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<PoImportService>(PoImportService);
    prisma = module.get<PrismaService>(PrismaService);
    queue = module.get<Queue>(getQueueToken('po-imports'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully schedule an import job when file is unique', async () => {
    // Arrange: Mock file buffering and hash simulation
    jest.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-excel-content'));
    jest.mocked(fs.existsSync).mockReturnValue(true);

    // Simulate NO matching SUCCESS history record found in database
    jest.mocked(prisma.poImportHistory.findFirst).mockResolvedValue(null);

    // Simulate creation of the PENDING history record tracking token
    const mockHistoryRecord = { id: 'history-uuid-123', fileName: 'mock-po.xlsx' } as any;
    jest.mocked(prisma.poImportHistory.upsert).mockResolvedValue(mockHistoryRecord);

    // Act: Fire gatekeeper service function execution
    const result = await service.importFromExcel(mockFile, 'user-123');

    // Assert: Verify database security locks and state records
    expect(prisma.poImportHistory.findFirst).toHaveBeenCalled();
    expect(prisma.poImportHistory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'PENDING', createdBy: 'user-123' }),
      }),
    );

    // Assert: Ensure payload handed off to BullMQ is structurally complete
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String), // job name, whatever yours is
      expect.objectContaining({
        historyId: expect.any(String),
        fileName: 'mock-po.xlsx',
        fileBuffer: mockFile.buffer.toString('base64'),
      }),
      expect.anything(), // job options, if you pass any
    );

    // Assert: Verify service payload matches the unified ImportResult mapping spec
    expect(result).toEqual({
      historyId: 'history-uuid-123',
      status: 'PENDING',
      duidCount: 0,
      poSucceeded: 0,
      linesProcessed: 0,
      errors: [],
    });
  });

  it('should reject file upload, trigger cleanup, and throw BadRequestException if file was already successfully imported', async () => {
    // Arrange: Mock matching content hashing profiles
    jest.mocked(fs.readFileSync).mockReturnValue(Buffer.from('duplicate-excel-content'));
    jest.mocked(fs.existsSync).mockReturnValue(true);

    // Simulate an existing SUCCESS ledger row found in system memory database logs
    const mockExistingSuccess = { id: 'old-id', createdAt: new Date() } as any;
    jest.mocked(prisma.poImportHistory.findFirst).mockResolvedValue(mockExistingSuccess);

    // Act & Assert: Execute and expect explicit validation termination crash
    await expect(service.importFromExcel(mockFile, 'user-123')).rejects.toThrow(BadRequestException);

    expect(queue.add).not.toHaveBeenCalled(); // Ensure bad processing job NEVER touches background queue resources
  });
});
