import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { ApproveFundRequestDto, ApprovalAction } from './dto/approve-fund-request.dto';
import { FundRequestResponseDto } from './dto/fund-request-response.dto';
import {
  NotificationType,
  FundRequestStatus,
  AuthRole,
  Prisma,
  FundRequest,
  PurchaseOrderLine,
  PurchaseOrder,
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { POLineSearchResponseDto } from './dto/po-search-response.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FullFundRequestPayload } from '@/notifications/types/notification-payload.interface';
import { logger } from '@/common/logger/logger';
import { POLineBalances } from './domain/types';
import { FundRequestRepository } from './infrastructure/fund-request.repository';

/** Extended type to include nested relations */
type FundRequestWithRelations = FundRequest & {
  purchaseOrderLine: PurchaseOrderLine & {
    purchaseOrder: PurchaseOrder;
  };
};

/** Payload for the notifications queue */
interface NotificationJobPayload {
  notificationId: string;
}

interface FundRequestFilters {
  query?: string;
  status?: string;
  poNumber?: string;
  poLineNumber?: string;
  duid?: string;
  pm?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class FundRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundRequestRepo: FundRequestRepository,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJobPayload>,
  ) {}

  /** PREFILL: Fetch PO Lines for PM form */
  async fetchFundRequestData(query: string): Promise<POLineSearchResponseDto[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    // 1. Search for POs matching the query in either duid or poNumber directly in the database to improve performance
    const pos = await this.prisma.purchaseOrderLine.findMany({
      where: {
        OR: [
          { purchaseOrder: { duid: { startsWith: cleanQuery, mode: 'insensitive' } } },
          { purchaseOrder: { poNumber: { startsWith: cleanQuery } } },
        ],
      },
      take: 200,
      include: {
        purchaseOrder: {
          select: {
            duid: true,
            poNumber: true,
            prNumber: true,
            projectName: true,
            projectCode: true,
          },
        },
      },
      orderBy: [{ purchaseOrder: { createdAt: 'desc' } }, { poLineNumber: 'asc' }],
    });

    return pos.map((line) => ({
      poLineId: line.id,
      duid: line.purchaseOrder.duid,
      poNumber: line.purchaseOrder.poNumber ?? null,
      prNumber: line.purchaseOrder.prNumber ?? null,
      poLineNumber: line.poLineNumber ?? null,
      itemDescription: line.itemDescription ?? null,
      projectName: line.purchaseOrder.projectName ?? null,
      projectCode: line.purchaseOrder.projectCode ?? null,
      itemCode: line.itemCode ?? null,
      unitPrice: line.unitPrice?.toNumber() ?? null,
      requestedQuantity: line.requestedQuantity ?? null,
      poLineAmount: line.poLineAmount?.toNumber() ?? null,
      poTypeId: line.poTypeId ?? null,
      pm: line.pm ?? null,
      pmId: line.pmId ?? null,
      requestedAmount: 0,
      poIssuedDate: line.poIssuedDate ?? null,

      // Fix: Use optional chaining + fallback for ALL decimal fields
      contractAmount: line.contractAmount?.toNumber() ?? null,
      cumulativeApprovedAmount: line.totalApprovedAmount?.toNumber() ?? 0,
      totalRequestedAmount: line.totalRequestedAmount?.toNumber() ?? 0, // Added ?
      totalRejectedAmount: line.totalRejectedAmount?.toNumber() ?? 0, // Added ?
      remainingBalance: line.remainingBalance?.toNumber() ?? 0,

      isNegotiationRequired: line.contractAmount === null,
    }));
  }

  /** CREATE FUND REQUEST */
  async createFundRequest(dto: CreateFundRequestDto, userId: string): Promise<FundRequestResponseDto> {
    if (dto.requestedAmount <= 0) {
      throw new BadRequestException('Requested amount must be greater than 0');
    }

    // Determine if this is a manual entry (no PO or line information) or a structured one. This affects the 'source' fields and notification payload.
    const isManual =
      !dto.poNumber || !dto.poLineNumber || dto.poNumber === 'TEMP-PO' || dto.poLineNumber === 'TEMP-LINE';

    /**
     * TRANSACTIONAL LOGIC:
     * 1. Upsert PO based on duid + poNumber (handles both manual and structured entries)
     * 2. Upsert PO Line based on purchaseOrderId + poLineNumber (handles both manual and structured entries)
     * 3. Validate requested amount against contract if it exists
     * 4. Create Fund Request
     * 5. Notify Admins (outside transaction to avoid delays in user response)
     * Note: We use "Serializable" isolation to ensure that concurrent requests for the same PO line are properly serialized, preventing race conditions
     * Important: We do NOT update the PO line's totalRequestedAmount or totalApprovedAmount inside this transaction. Instead,
     * we calculate those on-the-fly during approval to ensure accuracy and prevent concurrency issues.
     * This means that the "remainingBalance" is also calculated dynamically rather than stored, which simplifies our logic and reduces potential bugs.
     * This approach ensures that we maintain data integrity without having to worry about multiple concurrent fund requests trying to update the same PO line balances at the same time,
     * which can lead to complex locking and potential deadlocks.
     * By calculating totals during approval, we ensure that we always have the most up-to-date information without risking transaction conflicts.
     * This also means that the "remainingBalance" field on the PO line is more of a "snapshot" value that can be used for quick reference but is not the source of truth for calculations.
     * The source of truth for approvals will always be the contractAmount minus the sum of approved fund requests at the time of approval.
     * This design choice significantly reduces the complexity of our transactions and allows for better scalability as we don't have to worry about locking PO line records during fund request creation.
     */
    const fundRequest = await this.prisma.$transaction(
      async (tx) => {
        // 1. Upsert PO based on duid + poNumber. For manual entries, we use a "TEMP-PO" placeholder to ensure uniqueness while allowing the user to create a fund request.
        const po = await tx.purchaseOrder.upsert({
          // Using composite unique index on duid, ponumber to ensure we do not create duplicate pos for the same duid + poNumber combination.
          // This allows us to handle both manual and structured entries gracefully.
          where: { duid_poNumber: { duid: dto.duid.trim(), poNumber: dto.poNumber?.trim() ?? 'TEMP-PO' } },
          create: {
            duid: dto.duid.trim(),
            poNumber: dto.poNumber?.trim(),
            projectName: dto.projectName,
            projectCode: dto.projectCode,
            prNumber: dto.prNumber,
          },
          update: {}, // We do not update existing POs during fund request creation to preserve historical data integrity. Any changes to PO details should be handled through a separate process with proper auditing.
        });

        // 2. Upsert PO Line based on purchaseOrderId + poLineNumber. For manual entries, we use a "TEMP-LINE" placeholder to ensure uniqueness while allowing the user to create a fund request without specific line information.
        const poLine = await tx.purchaseOrderLine.upsert({
          where: {
            purchaseOrderId_poLineNumber: {
              purchaseOrderId: po.id,
              poLineNumber: dto.poLineNumber?.trim() ?? 'TEMP-LINE',
            },
          },
          create: {
            purchaseOrderId: po.id,
            poLineNumber: dto.poLineNumber?.trim(),
            pm: dto.pm,
            pmId: dto.pmId,
            itemCode: dto.itemCode,
            itemDescription: dto.itemDescription,
            unitPrice: dto.unitPrice,
            requestedQuantity: dto.requestedQuantity,
            poLineAmount: dto.poLineAmount,
            poIssuedDate: dto.poIssuedDate,
            contractAmount: null,
            /**
             * This cached totals below used on the po line exists for performance, fast reads for ui, reporting, and avoiding repeated aggregates at scale.
             */
            totalRequestedAmount: new Prisma.Decimal(0),
            totalRejectedAmount: new Prisma.Decimal(0),
            totalApprovedAmount: new Prisma.Decimal(0),
            remainingBalance: new Prisma.Decimal(0),
          },
          update: {}, // We do not update existing PO lines during fund request creation to preserve historical data integrity. Any changes to PO line details should be handled through a separate process with proper auditing.
        });

        // 3. Validate against contract
        // Also note that against performace stored in the poLine in line 183, this methods ensures correctness over perfomance.
        //  At this point we have access to the source of truth for total requested amount
        // But also, it degrades performance, fast reads for UI
        const aggregate = await tx.fundRequest.aggregate({
          where: {
            purchaseOrderLineId: poLine.id,
            status: { in: [FundRequestStatus.PENDING, FundRequestStatus.APPROVED] },
          },
          _sum: { requestedAmount: true },
        });

        // Use safe defaults to prevent "plus" crashes on null values.
        // The aggregate will return null for _sum.requestedAmount if there are no matching fund requests, so we default to 0 in that case
        // Stored totals are not mutated here just calculating a proposed future state
        const currentTotal = aggregate._sum.requestedAmount ?? new Prisma.Decimal(0); // from the database
        const newTotal = currentTotal.plus(dto.requestedAmount); // adding the new request amount to the total summed from the already existing data

        // Safe Error Message: Check if contractAmount exists before calling .toFixed()
        if (poLine.contractAmount && newTotal.gt(poLine.contractAmount)) {
          const maxStr = poLine.contractAmount ? poLine.contractAmount.toFixed(2) : '0.00';
          throw new BadRequestException(`Request exceeds contract. Total: ${newTotal.toFixed(2)}, Max: ${maxStr}`);
        }

        // 4. Create Fund Request
        return tx.fundRequest.create({
          data: {
            purchaseOrderLineId: poLine.id,
            requestedAmount: dto.requestedAmount,
            requestPurpose: dto.requestPurpose,
            requestedBy: userId,
            source: isManual ? 'MANUAL' : 'STRUCTURED',
          },
          include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
        }) as Promise<FundRequestWithRelations>;
      },
      {
        isolationLevel: 'Serializable', // Ensure the highest isolation level to prevent race conditions
      },
    );

    // 5. Notify Admins
    const admins = await this.prisma.user.findMany({
      where: { role: AuthRole.SUPER_ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      // ✅ Explicitly type the payload to catch missing fields early
      const payload: FullFundRequestPayload = {
        // 1. ADD THE DISCRIMINATOR TAG
        type: NotificationType.FUND_REQUEST_CREATED,

        duid: dto.duid,
        projectCode: dto.projectCode,
        projectName: dto.projectName,
        prNumber: dto.prNumber,
        poNumber: dto.poNumber,
        poLineAmount: Number(dto.poLineAmount) || 0,
        poLineNumber: dto.poLineNumber,
        itemDescription: dto.itemDescription,
        requestPurpose: dto.requestPurpose,
        pm: dto.pm,
        requestedAmount: Number(dto.requestedAmount),
        poIssuedDate: dto.poIssuedDate,
        contractAmount: fundRequest.purchaseOrderLine.contractAmount?.toNumber() ?? null,
        isNegotiation: fundRequest.purchaseOrderLine.contractAmount === null,
        requestedAt: fundRequest.createdAt,
        requestedBy: fundRequest.requestedBy,
      };

      void Promise.all(
        admins.map((admin) =>
          this.notificationsService.notify(admin.id, NotificationType.FUND_REQUEST_CREATED, payload, fundRequest.id),
        ),
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown notification error';
        logger.error(`[Admin Notification Failed] Request ${fundRequest.id}: ${message}`);
      });
    }

    // ✅ Ensure mapToResponseDto also uses safeNumber helpers internally
    return this.mapToResponseDto(fundRequest);
  }

  /**
   * APPROVE / REJECT FUND REQUEST
   * Step 1: Rejection -> Immediate stop.
   * Step 2: Contract Setup -> Saves amount, remains PENDING, returns early.
   * Step 3: Final Approval -> Only reached if contract exists and no new amount is passed.
   */
  async approveOrRejectFundRequest(
    fundRequestId: string,
    dto: ApproveFundRequestDto & { setContractAmount?: number },
    adminId: string,
  ): Promise<FundRequestResponseDto> {
    const { action, rejectionReason, setContractAmount } = dto;

    const fundRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.fundRequest.findUnique({
        where: { id: fundRequestId },
        include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
      });

      if (!request) throw new NotFoundException('Fund request not found');
      if (request.status !== FundRequestStatus.PENDING) {
        throw new BadRequestException('Request already processed');
      }

      // 1️⃣ REJECTION: Handle and return immediately
      if (action === ApprovalAction.REJECT) {
        return this.handleRejection(tx, request, rejectionReason, adminId);
      }

      // 2️⃣ CONTRACT SETUP: If admin provides an amount for a line without a contract
      if (setContractAmount != null) {
        return this.handleContractSetup(tx, request, setContractAmount);
      }

      // 3️⃣ FINAL APPROVAL: Reached only if no contract amount was passed in this request
      return this.handleApproval(tx, request, adminId);
    });

    // 🛡️ Safety check to satisfy TypeScript and prevent runtime crashes
    if (!fundRequest) {
      throw new InternalServerErrorException('Failed to process fund request transaction.');
    }

    if (fundRequest.status !== FundRequestStatus.PENDING) {
      const isApproved = fundRequest.status === FundRequestStatus.APPROVED;

      // 💡 Create shortcuts for cleaner code
      const poLine = fundRequest.purchaseOrderLine;
      const po = poLine.purchaseOrder;
      try {
        await this.notificationsService.notify(
          fundRequest.requestedBy,
          isApproved ? NotificationType.FUND_REQUEST_APPROVED : NotificationType.FUND_REQUEST_REJECTED,
          isApproved
            ? {
                type: NotificationType.FUND_REQUEST_APPROVED,
                duid: po.duid,
                poNumber: po.poNumber ?? undefined,
                projectName: po.projectName ?? undefined,
                projectCode: po.projectCode ?? undefined,
                pm: poLine.pm ?? undefined,
                itemDescription: poLine.itemDescription ?? undefined,
                status: fundRequest.status,
                requestedAmount: (fundRequest.requestedAmount ?? new Prisma.Decimal(0)).toNumber(),
                contractAmount: (poLine.contractAmount ?? new Prisma.Decimal(0)).toNumber(),
                remainingBalance:
                  (poLine.contractAmount ?? new Prisma.Decimal(0)).toNumber() -
                  (poLine.totalApprovedAmount ?? new Prisma.Decimal(0)).toNumber() -
                  (fundRequest.requestedAmount ?? new Prisma.Decimal(0)).toNumber(),
                poLineNumber: poLine.poLineNumber ?? undefined,
              }
            : {
                type: NotificationType.FUND_REQUEST_REJECTED,
                duid: po.duid,
                poNumber: po.poNumber ?? undefined,
                projectName: po.projectName ?? undefined,
                pm: poLine.pm ?? undefined,
                itemDescription: poLine.itemDescription ?? undefined,
                status: fundRequest.status,
                requestedAmount: (fundRequest.requestedAmount ?? new Prisma.Decimal(0)).toNumber(),
                rejectionReason: fundRequest.rejectionReason ?? 'No reason provided',
                poLineNumber: poLine.poLineNumber ?? undefined,
              },
          fundRequest.id,
        );
      } catch (err: unknown) {
        // Log background failures without interrupting the main user response
        const message = err instanceof Error ? err.message : 'Unknown notification error';
        logger.error(`[Notification Error] Request ${fundRequest.id}: ${message}`);
      }
    }

    // 3. Map to DTO for the frontend
    return this.mapToResponseDto(fundRequest);
  }

  private async handleContractSetup(
    tx: Prisma.TransactionClient,
    request: FundRequestWithRelations,
    setContractAmount: number,
  ) {
    const poLine = request.purchaseOrderLine;

    if (poLine.contractAmount) {
      throw new BadRequestException('Contract already exists');
    }

    if (setContractAmount <= 0) {
      throw new BadRequestException('Contract amount must be greater than zero');
    }

    const contract = new Prisma.Decimal(setContractAmount);

    await tx.purchaseOrderLine.update({
      where: { id: poLine.id },
      data: {
        contractAmount: contract,
        remainingBalance: contract,
      },
    });

    // ⛔ IMPORTANT: DO NOT TOUCH FUND REQUEST STATUS
    return await tx.fundRequest.findUnique({
      where: { id: request.id },
      include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
    });
  }

  private async handleApproval(tx: Prisma.TransactionClient, request: FundRequestWithRelations, adminId: string) {
    // 💡 Create shortcuts for cleaner code
    // We have already loaded the purchaseOrderLine and purchaseOrder in the parent transaction, so we can safely access them here without additional queries
    const poLine = request.purchaseOrderLine;

    //
    if (!poLine.contractAmount) {
      throw new BadRequestException({
        message: 'Contract amount required',
        requiresContract: true,
        poLineId: poLine.id,
      });
    }

    const repo = this.fundRequestRepo.withTx(tx);

    const { approvedSum } = await repo.getApprovedAggregate(poLine.id, request.id);

    const proposedTotal = approvedSum.plus(request.requestedAmount);

    if (proposedTotal.gt(poLine.contractAmount)) {
      throw new BadRequestException('Approval exceeds contract limit');
    }

    const approved = await repo.approveFundRequest(request.id, adminId);

    const balances: POLineBalances = {
      totalApprovedAmount: proposedTotal,
      totalRequestedAmount: poLine.totalRequestedAmount.plus(request.requestedAmount),
      remainingBalance: poLine.contractAmount.minus(proposedTotal),
    };

    const result = await repo.updatePOLineBalances(poLine.id, poLine.totalApprovedAmount, balances);

    if (!result.updated) {
      throw new ConflictException('Concurrent update detected');
    }

    return approved;
  }

  private async handleRejection(
    tx: Prisma.TransactionClient,
    request: FundRequestWithRelations,
    rejectionReason: string | undefined,
    adminId: string,
  ) {
    if (request.status !== FundRequestStatus.PENDING) {
      throw new ConflictException('Only pending requests can be rejected.');
    }

    const repo = this.fundRequestRepo.withTx(tx);

    const rejected = await repo.rejectFundRequest(request.id, rejectionReason?.trim() || 'N/A', adminId);

    await repo.updatePOLineRejectedAmountIncrement(request.purchaseOrderLine.id, request.requestedAmount);

    return rejected;
  }

  // for admins
  async getAllFundRequests(
    filters: FundRequestFilters, // Use your FundRequestFilters type here
    take: number = 20,
    cursorId?: string,
  ): Promise<{ data: FundRequestResponseDto[]; nextCursor: string | null }> {
    const { query, status, fromDate, toDate } = filters;
    const andConditions: Prisma.FundRequestWhereInput[] = [];

    // 1. Status Filter (Fixed for multi-status like "APPROVED,REJECTED")
    if (status && status !== 'ALL') {
      const statuses = status.split(',').map((s) => s.trim()) as FundRequestStatus[];
      if (statuses.length > 0) {
        andConditions.push({ status: { in: statuses } });
      }
    }

    // Date Range (Standard B-Tree index on createdAt handles this well)
    if (fromDate || toDate) {
      andConditions.push({
        createdAt: {
          gte: fromDate ? new Date(fromDate) : undefined,
          lte: toDate ? new Date(toDate) : undefined,
        },
      });
    }

    // Search Logic (Optimized for the indexes we built)
    if (query?.trim()) {
      const cleanQuery = query.trim();
      andConditions.push({
        OR: [
          { purchaseOrderLine: { purchaseOrder: { duid: { startsWith: cleanQuery, mode: 'insensitive' } } } },
          { purchaseOrderLine: { purchaseOrder: { poNumber: { startsWith: cleanQuery } } } },
        ],
      });
    }

    // 4. Build Query Args
    const queryArgs: Prisma.FundRequestFindManyArgs = {
      where: andConditions.length > 0 ? { AND: andConditions } : {},
      include: {
        purchaseOrderLine: { include: { purchaseOrder: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    };

    if (cursorId) {
      queryArgs.cursor = { id: cursorId };
      queryArgs.skip = 1;
    }

    const fundRequests = await this.prisma.fundRequest.findMany(queryArgs);

    // 5. Pagination Handshake
    const hasNextPage = fundRequests.length > take;
    const results = hasNextPage ? fundRequests.slice(0, take) : fundRequests;
    const lastItem = results[results.length - 1];
    const nextCursor = hasNextPage && lastItem ? lastItem.id : null;

    return {
      data: results.map((fr) => this.mapToResponseDto(fr as FundRequestWithRelations)),
      nextCursor,
    };
  }

  // for pms
  async getFundRequestHistory(
    userId: string,
    take: number = 20,
    cursorId?: string, // Accepts the ID of the last record fetched
  ): Promise<{ data: FundRequestResponseDto[]; nextCursor: string | null }> {
    const queryArgs: Prisma.FundRequestFindManyArgs = {
      where: { requestedBy: userId },
      include: {
        purchaseOrderLine: {
          include: { purchaseOrder: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // Fetch one extra to determine if there's a next page
    };

    // If cursor is provided, start exactly after that record
    if (cursorId) {
      queryArgs.cursor = { id: cursorId };
      queryArgs.skip = 1;
    }

    const history = (await this.prisma.fundRequest.findMany(queryArgs)) as FundRequestWithRelations[];

    const hasNextPage = history.length > take;
    const results = hasNextPage ? history.slice(0, take) : history;

    // Determine the next cursor based on the last record in the current batch
    const lastItem = results[results.length - 1];
    const nextCursor = hasNextPage && lastItem ? lastItem.id : null;

    return {
      data: results.map((req) => this.mapToResponseDto(req)),
      nextCursor,
    };
  }

  /** MAP: DB -> DTO */
  private mapToResponseDto(item: FundRequestWithRelations): FundRequestResponseDto {
    const poLine = item.purchaseOrderLine;
    const po = poLine.purchaseOrder;

    // SAFE HELPER: Handles null/undefined before calling .toFixed()
    const safeToNumber = (val: Prisma.Decimal | null | undefined, fallback = 0): number => {
      if (!val) return fallback;
      return Number(val.toFixed(2));
    };

    return {
      id: item.id,
      poLineId: poLine.id,
      status: item.status,

      // Use safeToNumber for EVERYTHING that could be null in the DB
      requestedAmount: safeToNumber(item.requestedAmount),
      requestPurpose: item.requestPurpose,

      totalRequestedAmount: safeToNumber(poLine.totalRequestedAmount),
      totalApprovedAmount: safeToNumber(poLine.totalApprovedAmount),

      // Explicitly allow null for contractAmount if that's your business logic
      contractAmount: poLine.contractAmount ? safeToNumber(poLine.contractAmount) : null,

      cumulativeApprovedAmount: safeToNumber(poLine.totalApprovedAmount),
      remainingBalance: safeToNumber(poLine.remainingBalance),

      isNegotiationRequired: poLine.contractAmount === null,

      duid: po.duid,
      poNumber: po.poNumber,
      prNumber: po.prNumber,
      projectName: po.projectName,
      projectCode: po.projectCode,

      poLineNumber: poLine.poLineNumber,
      poTypeId: poLine.poTypeId,
      itemCode: poLine.itemCode,
      itemDescription: poLine.itemDescription,

      unitPrice: safeToNumber(poLine.unitPrice, 0),
      requestedQuantity: poLine.requestedQuantity,
      poLineAmount: safeToNumber(poLine.poLineAmount, 0),

      poIssuedDate: poLine.poIssuedDate,
      pm: poLine.pm,
      pmId: poLine.pmId,

      createdAt: item.createdAt,
      rejectionReason: item.rejectionReason ?? null,
    };
  }
}
