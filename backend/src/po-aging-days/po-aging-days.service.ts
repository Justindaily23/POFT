import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoAgingDaysResponse } from './poAgingTypes/poAgingDaysResponse.type';
import { PoLineStatus, PoAgingFlag } from '@prisma/client';
import { PoAgingEvaluatorService } from './po-agin-evaluator.service';

@Injectable()
export class PoAgingDaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agingEvaluator: PoAgingEvaluatorService,
  ) {}

  async getAllPoAgingDays(
    take = 50,
    cursor?: string,
  ): Promise<{ data: PoAgingDaysResponse[]; nextCursor: string | null }> {
    const lines = await this.prisma.purchaseOrderLine.findMany({
      take,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // VERY IMPORTANT
      }),
      where: {
        poInvoiceDate: null,
        poIssuedDate: { not: null }, //  Filter out bad data at the DB level
        allowedOpenDays: { gt: 0 }, //  Prevent division by zero
      },
      select: {
        id: true,
        lastAgingNotifiedFlag: true,
        agingFlag: true,
        poLineNumber: true,
        itemDescription: true,
        itemCode: true,
        allowedOpenDays: true,
        poInvoiceDate: true,
        poLineStatus: true,
        pm: true,
        pmId: true,
        poIssuedDate: true,
        purchaseOrder: {
          select: {
            duid: true,
            poNumber: true,
            prNumber: true,
            projectCode: true,
            projectName: true,
          },
        },
        poType: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = lines.map((line) => {
      // 1. Determine the reference date (stop at invoice date, or use today)
      const endDate = line.poInvoiceDate ? new Date(line.poInvoiceDate) : new Date();

      // 2. Calculate the difference in days
      const diffInMs = endDate.getTime() - new Date(line.poIssuedDate!).getTime();
      const daysOpen = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      // 🔑 All aging logic now lives in ONE place
      const evaluation = this.agingEvaluator.evaluate({
        id: line.id,
        poIssuedDate: line.poIssuedDate!,
        allowedOpenDays: line.allowedOpenDays!,
        lastAgingNotifiedFlag: line.lastAgingNotifiedFlag,
      });

      return {
        id: line.id,
        duid: line.purchaseOrder?.duid ?? 'N/A',
        poNumber: line.purchaseOrder.poNumber ?? 'N/A',
        prNumber: line.purchaseOrder.prNumber ?? 'N/A',
        projectCode: line.purchaseOrder.projectCode ?? 'N/A',
        projectName: line.purchaseOrder.projectName ?? 'N/A',
        pm: line.pm ?? 'N/A',
        pmId: line.pmId ?? 'N/A',
        poLineNumber: line.poLineNumber ?? 'N/A',
        poType: line.poType?.code ?? 'N/A',
        poIssuedDate: line.poIssuedDate!,
        poInvoiceStatus: line.poInvoiceDate ? PoLineStatus.INVOICED : PoLineStatus.NOT_INVOICED,
        poInvoiceDate: line.poInvoiceDate,
        allowedOpenDays: Number(line.allowedOpenDays),
        numberOfDaysOpen: daysOpen > 0 ? daysOpen : 0, // Ensure no negative values
        agingFlag: evaluation.agingFlag,
        itemCode: line.itemCode ?? 'N/A',
        itemDescription: line.itemDescription ?? 'N/A',
      };
    });

    const nextCursor = data.length ? data[data.length - 1].id : null;
    return { data, nextCursor };
  }

  async markAgingNotified(poLineId: string, flag: PoAgingFlag) {
    return this.prisma.purchaseOrderLine.update({
      where: { id: poLineId },
      data: { lastAgingNotifiedFlag: flag },
    });
  }
}
