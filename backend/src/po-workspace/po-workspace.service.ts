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

    // 1. Table Data
    const poLinesRaw = await this.prisma.purchaseOrderLine.findMany({
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
        poType: { select: { code: true } },
        purchaseOrder: {
          select: { duid: true, poNumber: true, prNumber: true, projectCode: true, projectName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const poLines: PurchaseOrderLine[] = poLinesRaw.map((line) => {
      // FIX: Number() never returns nullish values, so use || 0 inside to ensure safety
      const totalApproved = Number(line.totalApprovedAmount || 0);
      const contractAmt = line.contractAmount ? Number(line.contractAmount) : 0;

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
        balanceDue: contractAmt - totalApproved,
      };
    });

    // 2. Metrics logic
    const allLinesForMetrics = await this.prisma.purchaseOrderLine.findMany({
      select: {
        poLineAmount: true,
        contractAmount: true,
        totalApprovedAmount: true,
        totalRequestedAmount: true,
        totalRejectedAmount: true,
        poLineStatus: true,
      },
    });

    const metrics: FinancialMetrics = allLinesForMetrics.reduce(
      (acc, line) => {
        const amount = Number(line.poLineAmount || 0);
        const approved = Number(line.totalApprovedAmount || 0);
        const rejected = Number(line.totalRejectedAmount || 0);

        acc.totalPoAmount += amount;
        acc.totalContractAmount += Number(line.contractAmount || 0);
        acc.totalAmountRequested += Number(line.totalRequestedAmount || 0);
        acc.totalAmountSpent += approved;
        acc.totalAmountRejected += rejected;

        if (line.poLineStatus === PoLineStatus.INVOICED) {
          // This ensures totalInvoicedAmount is initialized or handled correctly
          acc.totalInvoicedAmount = (acc.totalInvoicedAmount || 0) + amount;
        }

        return acc;
      },
      {
        totalPoAmount: 0,
        totalContractAmount: 0,
        totalAmountRequested: 0,
        totalAmountRejected: 0,
        totalAmountSpent: 0,
        totalInvoicedAmount: 0,
        balanceDue: 0,
      },
    );

    metrics.balanceDue = metrics.totalContractAmount - metrics.totalAmountSpent;

    const nextCursor = poLinesRaw.length === limit ? poLinesRaw[poLinesRaw.length - 1].id : null;

    return {
      data: poLines,
      metrics,
      totalCount: await this.prisma.purchaseOrderLine.count({ where: lineWhere }),
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
