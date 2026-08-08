import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoWorkspaceFilterDto } from './dto/po-workspace-filter.dto';
import { FinancialMetrics, PoWorkspaceResponse } from './dto/po-workspace.response.dto';
import { PoLineStatus, Prisma } from '@prisma/client';
import { PurchaseOrderLine } from './dto/po-workspace.response.dto';

@Injectable()
export class PoWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getPoTypes() {
    return this.prisma.poType.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async getWorkspace(filters: PoWorkspaceFilterDto): Promise<PoWorkspaceResponse & { nextCursor: string | null }> {
    const { limit = 20, cursor } = filters;

    const lineWhere: Prisma.PurchaseOrderLineWhereInput = {
      poType: filters.poTypes?.length ? { code: { in: filters.poTypes } } : undefined,
      pm: filters.pm ? { contains: filters.pm, mode: 'insensitive' } : undefined,
      purchaseOrder: {
        duid: filters.duid ? { contains: filters.duid, mode: 'insensitive' } : undefined,
        poNumber: filters.poNumber ? { contains: filters.poNumber, mode: 'insensitive' } : undefined,
        projectName: filters.projectName ? { contains: filters.projectName, mode: 'insensitive' } : undefined,
        projectCode: filters.projectCode ? { contains: filters.projectCode, mode: 'insensitive' } : undefined,
      },
    };

    // 1. Table Data + count + aggregate metrics all run in parallel — no full-table fetch
    const [poLinesRaw, totalCount, sums, invoicedSum] = await Promise.all([
      this.prisma.purchaseOrderLine.findMany({
        where: lineWhere,
        take: limit,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          poLineNumber: true,
          poLineAmount: true,
          contractAmount: true,
          requestedQuantity: true,
          poLineStatus: true,
          pm: true,
          allowedOpenDays: true,
          itemCode: true,
          unitPrice: true,
          itemDescription: true,
          totalApprovedAmount: true,
          totalRequestedAmount: true,
          totalRejectedAmount: true,
          remainingBalance: true,
          poType: { select: { code: true } },
          purchaseOrder: {
            select: { duid: true, poNumber: true, prNumber: true, projectCode: true, projectName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrderLine.count({ where: lineWhere }),
      this.prisma.purchaseOrderLine.aggregate({
        where: lineWhere,
        _sum: {
          poLineAmount: true,
          contractAmount: true,
          totalRequestedAmount: true,
          totalApprovedAmount: true,
          totalRejectedAmount: true,
        },
      }),
      this.prisma.purchaseOrderLine.aggregate({
        where: { ...lineWhere, poLineStatus: PoLineStatus.INVOICED },
        _sum: { poLineAmount: true },
      }),
    ]);

    const poLines: PurchaseOrderLine[] = poLinesRaw.map((line) => {
      const totalApproved = Number(line.totalApprovedAmount || 0);

      return {
        id: line.id,
        duid: line.purchaseOrder.duid,
        poNumber: line.purchaseOrder.poNumber ?? 'N/A',
        prNumber: line.purchaseOrder.prNumber ?? 'N/A',
        projectCode: line.purchaseOrder.projectCode ?? 'N/A',
        projectName: line.purchaseOrder.projectName ?? 'N/A',
        pm: line.pm ?? 'N/A',
        poLineNumber: line.poLineNumber ?? 'N/A',
        poType: line.poType?.code ?? 'N/A',
        unitPrice: Number(line.unitPrice || 0),
        requestedQuantity: line.requestedQuantity ?? 0,
        poLineAmount: Number(line.poLineAmount || 0),
        itemDescription: line.itemDescription ?? 'N/A',
        contractAmount: line.contractAmount ? Number(line.contractAmount) : null,
        status: line.poLineStatus,
        amountRequested: Number(line.totalRequestedAmount || 0),
        amountRejected: Number(line.totalRejectedAmount || 0),
        amountSpent: totalApproved,
        // ✅ FIX: use the persisted, reconciled value instead of recomputing
        // contractAmt - totalApproved here. reconcilePoLineFinancials is the
        // single source of truth for this number.
        balanceDue: Number(line.remainingBalance || 0),
      };
    });

    // 2. Metrics — now a DB-side SUM instead of fetching every matching row into Node
    const metrics: FinancialMetrics = {
      totalPoAmount: Number(sums._sum.poLineAmount || 0),
      totalContractAmount: Number(sums._sum.contractAmount || 0),
      totalAmountRequested: Number(sums._sum.totalRequestedAmount || 0),
      totalAmountRejected: Number(sums._sum.totalRejectedAmount || 0),
      totalAmountSpent: Number(sums._sum.totalApprovedAmount || 0),
      totalInvoicedAmount: Number(invoicedSum._sum.poLineAmount || 0),
      balanceDue: 0,
    };

    metrics.balanceDue = metrics.totalContractAmount - metrics.totalAmountSpent;

    const nextCursor = poLinesRaw.length === limit ? poLinesRaw[poLinesRaw.length - 1].id : null;

    return {
      data: poLines,
      metrics,
      totalCount,
      nextCursor,
    };
  }

  async updatePoLineStatus(id: string, status: PoLineStatus) {
    try {
      return await this.prisma.purchaseOrderLine.update({
        where: { id },
        data: { poLineStatus: status },
        select: { id: true, poLineStatus: true },
      });
    } catch (error: unknown) {
      // FIX: Type-safe error handling for production stability
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update PO Line status: ${errorMessage}`);
    }
  }
}
