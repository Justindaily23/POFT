import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import Decimal from 'decimal.js';
import { logger } from 'src/common/logger/logger';
import { NotificationType } from '@prisma/client';
import { ContractAmendedPayload } from '@/notifications/types/notification-payload.interface';
@Injectable()
export class ContractAmendmentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createAmendment(dto: CreateContractAmendmentDto, adminId: string) {
    const { purchaseOrderLineId, newContractAmount, reason } = dto;
    const decimalNewAmount = new Decimal(newContractAmount);

    if (new Decimal(newContractAmount).lte(0)) {
      throw new BadRequestException('Contract amount must be a positive value');
    }
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A valid reason (min 5 characters) is required for audit');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const poLine = await tx.purchaseOrderLine.findUnique({
          where: { id: purchaseOrderLineId },
        });

        if (!poLine) throw new NotFoundException('PO line not found');

        const currentContractAmount = new Decimal(poLine.contractAmount ?? 0);
        if (currentContractAmount.isZero()) {
          throw new BadRequestException(
            'This PO line has no initial contract amount set. Please setup the contract first.',
          );
        }

        // const decimalNewAmount = new Decimal(newContractAmount);
        const totalApproved = new Decimal(poLine.totalApprovedAmount ?? 0);

        if (decimalNewAmount.lt(totalApproved)) {
          // FIX: Added .toString() to totalApproved to resolve template literal error
          throw new BadRequestException(
            `Safety Violation: New amount (₦${newContractAmount}) cannot be less than the ₦${totalApproved.toString()} already approved for payment.`,
          );
        }

        const remainingBalance = decimalNewAmount.minus(totalApproved);

        const updatedPoLine = await tx.purchaseOrderLine.update({
          where: {
            id: purchaseOrderLineId,
            version: poLine.version,
          },
          data: {
            contractAmount: newContractAmount,
            remainingBalance: remainingBalance.toNumber(),
            version: { increment: 1 },
          },
        });

        const amendment = await tx.contractAmendment.create({
          data: {
            purchaseOrderLineId,
            oldAmount: poLine.contractAmount ?? 0,
            newAmount: newContractAmount,
            reason,
            approvedBy: adminId,
          },
        });

        const fundRequesters = await tx.fundRequest.findMany({
          where: { purchaseOrderLineId },
          select: { requestedBy: true },
          distinct: ['requestedBy'],
        });

        return { amendment, updatedPoLine, fundRequesters };
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    // 7. Background Notification Dispatch (Non-Blocking)
    if (result.fundRequesters.length > 0) {
      const notificationPayload: ContractAmendedPayload = {
        type: NotificationType.CONTRACT_AMENDED,
        poLineId: purchaseOrderLineId,
        newAmount: newContractAmount,
        oldAmount: new Decimal(result.amendment.oldAmount).toNumber(),
        reason,
      };

      // ✅ FIRE AND FORGET: Admin gets the response immediately
      // The 'async' wrapper ensures errors don't crash the main process
      void (async () => {
        try {
          // Use allSettled so one failure doesn't stop the loop
          await Promise.allSettled(
            result.fundRequesters.map((r) =>
              this.notificationsService.notify(r.requestedBy, NotificationType.CONTRACT_AMENDED, notificationPayload),
            ),
          );
        } catch (err) {
          logger.error(`[Background Notification Error]: ${err}`);
        }
      })();
    }

    return {
      amendment: result.amendment,
      updatedPoLine: result.updatedPoLine,
    };
  }
}
