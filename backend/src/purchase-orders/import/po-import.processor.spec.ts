import { Test, TestingModule } from '@nestjs/testing';
import { PoImportProcessor } from './po-import.processor';
import { PrismaService } from '@/prisma/prisma.service';
import { PoLineFinancialService } from '@/common/financial/po-line-financial.service';
import { readExcel } from './excel.reader';
import { validateRows } from './po-import.validator';
import { Job } from 'bullmq';
import * as fs from 'fs';
import { PoExcelRow } from './interfaces/po-import.interface';

// 1. Explicitly mock custom file utility modules
jest.mock('./excel.reader');
jest.mock('./po-import.validator');

// 2. Mock 'fs' while preserving native methods like mkdirSync for Winston
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

describe('PoImportProcessor', () => {
  let processor: PoImportProcessor;
  let prisma: PrismaService;
  let financialService: PoLineFinancialService;

  // Reference database records
  const mockPoTypes = [{ id: 'type-id-123', code: 'STANDARD_PO' }];
  const mockPmIds = [{ staffId: 'pm-99' }];

  // Mock transaction database client (tx)
  const mockTxClient = {
    purchaseOrder: { upsert: jest.fn() },
    purchaseOrderLine: { upsert: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoImportProcessor,
        {
          provide: PrismaService,
          useValue: {
            poType: { findMany: jest.fn().mockResolvedValue(mockPoTypes) },
            staffProfile: { findMany: jest.fn().mockResolvedValue(mockPmIds) },
            poImportHistory: { update: jest.fn().mockResolvedValue({}) },
            $transaction: jest.fn().mockImplementation((callback) => callback(mockTxClient)),
          },
        },
        {
          provide: PoLineFinancialService,
          useValue: { reconcilePoLineFinancials: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    processor = module.get<PoImportProcessor>(PoImportProcessor);
    prisma = module.get<PrismaService>(PrismaService);
    financialService = module.get<PoLineFinancialService>(PoLineFinancialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a valid excel import successfully and log SUCCESS', async () => {
    // Arrange: Create mock background job payload
    const mockJob = {
      data: { historyId: 'history-uuid', filePath: 'uploads/test.xlsx' },
    } as Job;

    // Arrange: Fake data rows returning from your reader and validator
    const mockValidatedRows: PoExcelRow[] = [
      {
        duid: 'DUID001',
        poNumber: 'PO-1001',
        projectName: 'Project Alpha',
        projectCode: 'PA01',
        prNumber: 'PR-55',
        poType: 'Standard PO',
        poLineNumber: '1',
        pm: 'John Doe',
        pmId: 'pm-99',
        poIssuedDate: new Date(),
        itemCode: 'ITEM-X',
        itemDescription: 'Widget',
        unitPrice: 150.0,
        requestedQuantity: 2,
        allowedOpenDays: 30,
      },
    ];

    // Configure type-safe mock tracking values
    jest.mocked(readExcel).mockReturnValue(mockValidatedRows);
    jest.mocked(validateRows).mockReturnValue(mockValidatedRows);
    jest.mocked(fs.existsSync).mockReturnValue(true);

    // Mock upsert steps inside transaction loops
    mockTxClient.purchaseOrder.upsert.mockResolvedValue({ id: 'po-header-uuid' });
    mockTxClient.purchaseOrderLine.upsert.mockResolvedValue({ id: 'po-line-uuid' });

    // Act: Run background execution engine
    await processor.process(mockJob);

    // Assert: Verify processing pipeline steps
    expect(readExcel).toHaveBeenCalledWith('uploads/test.xlsx');
    expect(validateRows).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTxClient.purchaseOrder.upsert).toHaveBeenCalled();
    expect(mockTxClient.purchaseOrderLine.upsert).toHaveBeenCalled();
    expect(financialService.reconcilePoLineFinancials).toHaveBeenCalledWith(mockTxClient, 'po-line-uuid');

    // Assert: Verify it updated history table record as SUCCESS
    expect(prisma.poImportHistory.update).toHaveBeenCalledWith({
      where: { id: 'history-uuid' },
      data: {
        status: 'SUCCESS',
        duidCount: 1,
        poCount: 1,
        poLineCount: 1,
        errors: [],
      },
    });

    // Assert: Check disk physical cleanup occurred
    expect(fs.unlinkSync).toHaveBeenCalledWith('uploads/test.xlsx');
  });

  it('should catch errors, rollback, and update history table to FAILED if PO Type lookup fails', async () => {
    // Arrange: Create background job mock
    const mockJob = {
      data: { historyId: 'history-uuid', filePath: 'uploads/test.xlsx' },
    } as Job;

    // Arrange: Structurally complete mock bad rows to satisfy PoExcelRow interface
    const mockBadRows: PoExcelRow[] = [
      {
        duid: 'DUID001',
        poNumber: 'PO-1001',
        projectName: 'Project Alpha',
        projectCode: 'PA01',
        prNumber: 'PR-55',
        poType: 'NON_EXISTENT_TYPE', // This will fail map lookup
        poLineNumber: '1',
        pm: 'John Doe',
        pmId: 'pm-99',
        poIssuedDate: new Date(),
        itemCode: 'ITEM-X',
        itemDescription: 'Widget',
        unitPrice: 150.0,
        requestedQuantity: 2,
        allowedOpenDays: 30,
      },
    ];

    // Configure type-safe mocks
    jest.mocked(readExcel).mockReturnValue(mockBadRows);
    jest.mocked(validateRows).mockReturnValue(mockBadRows);
    jest.mocked(fs.existsSync).mockReturnValue(true);
    mockTxClient.purchaseOrder.upsert.mockResolvedValue({ id: 'po-header-uuid' });

    // Act: Run processor loop
    await processor.process(mockJob);

    // Assert: History table must register a FAILED status containing error array log details
    expect(prisma.poImportHistory.update).toHaveBeenCalledWith({
      where: { id: 'history-uuid' },
      data: {
        status: 'FAILED',
        errors: [expect.stringContaining('Unknown PO Type: NON_EXISTENT_TYPE')],
      },
    });

    // Assert: File cleanup occurs even under unexpected failures
    expect(fs.unlinkSync).toHaveBeenCalledWith('uploads/test.xlsx');
  });

  it('should update history table to FAILED with a system error if database lookups fail', async () => {
    // Arrange: Create background job mock
    const mockJob = {
      data: { historyId: 'history-uuid', filePath: 'uploads/test.xlsx' },
    } as Job;

    const mockRows: PoExcelRow[] = [
      {
        duid: 'DUID001',
        poNumber: 'PO-1001',
        projectName: 'Alpha',
        projectCode: 'PA01',
        prNumber: 'PR-55',
        poType: 'STANDARD_PO',
        poLineNumber: '1',
        pm: 'John Doe',
        pmId: 'pm-99',
        poIssuedDate: new Date(),
        itemCode: 'ITEM-X',
        itemDescription: 'Widget',
        unitPrice: 10,
        requestedQuantity: 1,
        allowedOpenDays: 5,
      },
    ];

    // Arrange: Force Prisma database methods to throw an operational exception
    jest.spyOn(prisma.poType, 'findMany').mockRejectedValue(new Error('DB Connection Timeout'));
    jest.mocked(readExcel).mockReturnValue(mockRows);
    jest.mocked(fs.existsSync).mockReturnValue(true);

    // Act: Execute background processor engine
    await processor.process(mockJob);

    // Assert: Check that it intercepts the failure and transforms it into your clean custom error message
    expect(prisma.poImportHistory.update).toHaveBeenCalledWith({
      where: { id: 'history-uuid' },
      data: {
        status: 'FAILED',
        // ✅ Fixed: Matches the exact fallback string your processor class actually outputs
        errors: [expect.stringContaining('Failed to load validation metadata')],
      },
    });

    // Assert: File cleanup occurs even under structural infrastructure failures
    expect(fs.unlinkSync).toHaveBeenCalledWith('uploads/test.xlsx');
  });
});
