// src/contract-amendments/contract-amendments.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import Decimal from 'decimal.js';

@Injectable()
export class ContractAmendmentsService {
  constructor(private prisma: PrismaService) {}

  async createAmendment(dto: CreateContractAmendmentDto, adminId: string) {
    const { purchaseOrderLineId, newContractAmount, reason } = dto;

    return this.prisma.$transaction(async (tx) => {
      const poLine = await tx.purchaseOrderLine.findUnique({
        where: { id: purchaseOrderLineId },
      });

      if (!poLine) throw new NotFoundException('PO line not found');

      // Cannot reduce below totalApprovedAmount
      if (new Decimal(newContractAmount).lt(poLine.totalApprovedAmount)) {
        throw new BadRequestException(
          `New contract amount (${newContractAmount}) cannot be less than total approved amount (${poLine.totalApprovedAmount})`,
        );
      }

      const oldAmount = poLine.contractAmount ?? 0;
      const remainingBalance = new Decimal(newContractAmount).minus(poLine.totalApprovedAmount);

      // 1️⃣ Update PO line contractAmount & remainingBalance
      await tx.purchaseOrderLine.update({
        where: { id: poLine.id },
        data: {
          contractAmount: newContractAmount,
          remainingBalance,
        },
      });

      // 2️⃣ Record amendment for audit
      const amendment = await tx.contractAmendment.create({
        data: {
          purchaseOrderLineId,
          oldAmount,
          newAmount: newContractAmount,
          reason,
          approvedBy: adminId,
        },
      });

      // 3️⃣ Notify PMs who requested fund on this PO line
      const fundRequesters = await tx.fundRequest.findMany({
        where: { purchaseOrderLineId: poLine.id },
        select: { requestedBy: true },
        distinct: ['requestedBy'],
      });

      for (const user of fundRequesters) {
        await tx.notification.create({
          data: {
            userId: user.requestedBy,
            type: 'CONTRACT_AMENDED',
            fundRequestId: null,
            payload: { poLineId: poLine.id, newAmount: newContractAmount, oldAmount, reason },
          },
        });
      }

      return amendment;
    });
  }
}
