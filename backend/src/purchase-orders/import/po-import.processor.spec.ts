import { Test, TestingModule } from '@nestjs/testing';
import { PoImportProcessor } from './po-import.processor';
import { PrismaService } from '@/prisma/prisma.service';
import { PoLineFinancialService } from '@/common/financial/po-line-financial.service';
import { readExcel } from './excel.reader';
import { validateRows } from './po-import.validator';
import { Job } from 'bullmq';
import { PoExcelRow } from './interfaces/po-import.interface';

jest.mock('./excel.reader');
jest.mock('./po-import.validator');

describe('PoImportProcessor', () => {
  let processor: PoImportProcessor;
  let prisma: PrismaService;
  let financialService: PoLineFinancialService;

  const mockPoTypes = [{ id: 'type-id-123', code: 'STANDARD_PO' }];
  const mockPmIds = [{ staffId: 'pm-99' }];

  const mockTxClient = {
    purchaseOrder: { upsert: jest.fn() },
    purchaseOrderLine: { upsert: jest.fn() },
  };

  // The processor reads job.data.{historyId, fileBuffer (base64 string), fileName}
  const makeJob = () =>
    ({
      data: {
        historyId: 'history-uuid',
        fileName: 'test.xlsx',
        fileBuffer: Buffer.from('dummy-excel-bytes').toString('base64'),
      },
    }) as unknown as Job;

  const makeRow = (overrides: Partial<PoExcelRow> = {}): PoExcelRow => ({
    duid: 'DUID001',
    poNumber: 'PO-1001',
    projectName: 'Project Alpha',
    projectCode: 'PA01',
    prNumber: 'PR-55',
    poType: 'Standard PO', // normalised to STANDARD_PO by the processor
    poLineNumber: '1',
    pm: 'John Doe',
    pmId: 'pm-99',
    poIssuedDate: new Date(),
    itemCode: 'ITEM-X',
    itemDescription: 'Widget',
    unitPrice: 150.0,
    requestedQuantity: 2,
    allowedOpenDays: 30,
    ...overrides,
  });

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
          // Phase 2 now uses the batched method, outside the transaction
          useValue: { reconcileManyPoLines: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    processor = module.get(PoImportProcessor);
    prisma = module.get(PrismaService);
    financialService = module.get(PoLineFinancialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a valid excel import successfully and log SUCCESS', async () => {
    const rows = [makeRow()];
    jest.mocked(readExcel).mockReturnValue(rows);
    jest.mocked(validateRows).mockReturnValue(rows);
    mockTxClient.purchaseOrder.upsert.mockResolvedValue({ id: 'po-header-uuid' });
    mockTxClient.purchaseOrderLine.upsert.mockResolvedValue({ id: 'po-line-uuid' });

    await processor.process(makeJob());

    expect(readExcel).toHaveBeenCalledWith(expect.any(Buffer), 'test.xlsx');
    expect(validateRows).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTxClient.purchaseOrder.upsert).toHaveBeenCalled();
    expect(mockTxClient.purchaseOrderLine.upsert).toHaveBeenCalled();

    // Reconciliation is batched and runs after the transaction, with no tx client
    expect(financialService.reconcileManyPoLines).toHaveBeenCalledWith(['po-line-uuid']);

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
  });

  it('should update history to FAILED and rethrow if the PO Type is unknown', async () => {
    const rows = [makeRow({ poType: 'NON_EXISTENT_TYPE' })];
    jest.mocked(readExcel).mockReturnValue(rows);
    jest.mocked(validateRows).mockReturnValue(rows);
    mockTxClient.purchaseOrder.upsert.mockResolvedValue({ id: 'po-header-uuid' });

    // The processor rethrows after recording the failure
    await expect(processor.process(makeJob())).rejects.toThrow(
      /Import script terminated: .*Unknown PO Type: NON_EXISTENT_TYPE/,
    );

    expect(prisma.poImportHistory.update).toHaveBeenCalledWith({
      where: { id: 'history-uuid' },
      data: {
        status: 'FAILED',
        errors: [expect.stringContaining('Unknown PO Type: NON_EXISTENT_TYPE')],
      },
    });

    // Nothing should be reconciled when the transaction failed
    expect(mockTxClient.purchaseOrderLine.upsert).not.toHaveBeenCalled();
    expect(financialService.reconcileManyPoLines).not.toHaveBeenCalled();
  });

  it('should update history to FAILED with a system error if database lookups fail', async () => {
    jest.spyOn(prisma.poType, 'findMany').mockRejectedValue(new Error('DB Connection Timeout'));
    jest.mocked(readExcel).mockReturnValue([makeRow()]);

    await expect(processor.process(makeJob())).rejects.toThrow(/Failed to load validation metadata/);

    expect(prisma.poImportHistory.update).toHaveBeenCalledWith({
      where: { id: 'history-uuid' },
      data: {
        status: 'FAILED',
        errors: [expect.stringContaining('Failed to load validation metadata')],
      },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should fail clearly when the job has no file data', async () => {
    const job = { data: { historyId: 'history-uuid', fileName: 'test.xlsx' } } as unknown as Job;

    // Only passes once you add the `if (!fileBuffer) throw ...` guard to the processor
    await expect(processor.process(job)).rejects.toThrow(/missing file data/);
  });
});