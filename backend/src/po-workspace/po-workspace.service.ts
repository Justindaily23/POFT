import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoWorkspaceFilterDto } from './dto/po-workspace-filter.dto';
import { FinancialMetrics, PoWorkspaceResponse } from './dto/po-workspace.response.dto';
import { FundRequestStatus, Prisma } from '@prisma/client';
import { PurchaseOrderLine } from './dto/po-workspace.response.dto';

@Injectable()
export class PoWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspace(filters: PoWorkspaceFilterDto): Promise<PoWorkspaceResponse> {
    const { page = 1, limit = 20 } = filters; // default pagination

    // --- Build line-level where filter ---
    const lineWhere: Prisma.PurchaseOrderLineWhereInput = {
      poType: filters.poTypes?.length ? { code: { in: filters.poTypes } } : undefined,
      purchaseOrder: {
        duid: filters.duid ? { contains: filters.duid, mode: 'insensitive' } : undefined,
        poNumber: filters.poNumber ? { contains: filters.poNumber, mode: 'insensitive' } : undefined,
        projectName: filters.projectName ? { contains: filters.projectName, mode: 'insensitive' } : undefined,
        projectCode: filters.projectCode ? { contains: filters.projectCode, mode: 'insensitive' } : undefined,
        pm: filters.pm ? { contains: filters.pm, mode: 'insensitive' } : undefined,
      },
    };

    // --- Fetch total count for pagination ---
    const totalCount = await this.prisma.purchaseOrderLine.count({
      where: lineWhere,
    });

    // --- Fetch paginated PO lines for table ---
    const poLinesRaw = await this.prisma.purchaseOrderLine.findMany({
      where: lineWhere,
      select: {
        id: true,
        poLineNumber: true,
        poLineAmount: true,
        contractAmount: true,
        requestedQuantity: true,
        poLineStatus: true,
        itemCode: true,
        unitPrice: true,
        itemDescription: true,
        poType: { select: { code: true } },
        purchaseOrder: {
          select: { duid: true, poNumber: true, prNumber: true, projectCode: true, projectName: true, pm: true },
        },
        FundRequests: { select: { requestedAmount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // --- Map to frontend shape ---
    const poLines: PurchaseOrderLine[] = poLinesRaw.map((line) => {
      const totalApproved = line.FundRequests.filter((fr) => fr.status === FundRequestStatus.APPROVED).reduce(
        (sum, fr) => sum + Number(fr.requestedAmount),
        0,
      );

      const totalRequested = line.FundRequests.reduce((sum, fr) => sum + Number(fr.requestedAmount), 0);

      return {
        id: line.id,
        duid: line.purchaseOrder.duid,
        poNumber: line.purchaseOrder.poNumber ?? '',
        prNumber: line.purchaseOrder.prNumber ?? '',
        projectCode: line.purchaseOrder.projectCode ?? '',
        projectName: line.purchaseOrder.projectName ?? '',
        pm: line.purchaseOrder.pm ?? '',
        poLineNumber: Number(line.poLineNumber),
        poType: line.poType?.code ?? '',
        unitPrice: Number(line.unitPrice) ?? 0,
        requestedQuantity: line.requestedQuantity ?? 0,
        poLineAmount: Number(line.poLineAmount) ?? 0,
        itemDescription: line.itemDescription ?? '',
        contractAmount: line.contractAmount ? Number(line.contractAmount) : null,
        status: line.poLineStatus,
        amountRequested: totalRequested,
        amountSpent: totalApproved,
        balanceDue: (line.contractAmount ? Number(line.contractAmount) : 0) - totalApproved,
      };
    });

    // --- Compute metrics on all filtered rows (not paginated) ---
    const allLinesForMetrics = await this.prisma.purchaseOrderLine.findMany({
      where: lineWhere,
      select: {
        poLineAmount: true,
        contractAmount: true,
        FundRequests: { select: { requestedAmount: true, status: true } },
      },
    });

    const metrics: FinancialMetrics = allLinesForMetrics.reduce(
      (acc, line) => {
        const totalApproved = line.FundRequests.filter((fr) => fr.status === FundRequestStatus.APPROVED).reduce(
          (sum, fr) => sum + Number(fr.requestedAmount),
          0,
        );
        const totalRequested = line.FundRequests.reduce((sum, fr) => sum + Number(fr.requestedAmount), 0);

        acc.totalPoAmount += Number(line.poLineAmount);
        acc.totalContractAmount += line.contractAmount ? Number(line.contractAmount) : 0;
        acc.totalAmountRequested += totalRequested;
        acc.totalAmountSpent += totalApproved;
        return acc;
      },
      { totalPoAmount: 0, totalContractAmount: 0, totalAmountRequested: 0, totalAmountSpent: 0, balanceDue: 0 },
    );

    metrics.balanceDue = metrics.totalContractAmount - metrics.totalAmountSpent;

    return {
      data: poLines,
      metrics,
      totalCount,
    };
  }
}
