import { Injectable } from '@nestjs/common';
import { PoAgingFlag, PurchaseOrderLine, PoLineStatus } from '@prisma/client';

export interface AgingEvaluationResult {
  poLineId: string;
  agingFlag: PoAgingFlag;
  daysOpen: number;
  allowedOpenDays: number;
  shouldNotify: boolean;
}

@Injectable()
export class PoAgingEvaluatorService {
  evaluate(
    line: Pick<PurchaseOrderLine, 'id' | 'poIssuedDate' | 'allowedOpenDays' | 'lastAgingNotifiedFlag' | 'poLineStatus'>,
  ): AgingEvaluationResult {
    /**
     * 🛡️ SYNC GUARD:
     * If the PO is already INVOICED, we "freeze" the aging.
     * It returns GREEN and 0 days open so it disappears from 'At Risk' reports.
     */
    if (line.poLineStatus === PoLineStatus.INVOICED) {
      return {
        poLineId: line.id,
        agingFlag: PoAgingFlag.GREEN,
        daysOpen: 0,
        allowedOpenDays: line.allowedOpenDays ?? 0,
        shouldNotify: false,
      };
    }

    if (!line.poIssuedDate || !line.allowedOpenDays || line.allowedOpenDays <= 0) {
      return {
        poLineId: line.id,
        agingFlag: PoAgingFlag.GREEN,
        daysOpen: 0,
        allowedOpenDays: line.allowedOpenDays ?? 0,
        shouldNotify: false,
      };
    }

    const today = new Date();
    const daysOpen = Math.max(0, Math.floor((today.getTime() - line.poIssuedDate.getTime()) / 86400000));
    const agingPercentage = (daysOpen / line.allowedOpenDays) * 100;

    let agingFlag: PoAgingFlag = PoAgingFlag.GREEN;

    if (agingPercentage > 70 && agingPercentage <= 100) {
      agingFlag = PoAgingFlag.WARNING;
    }

    if (agingPercentage > 100) {
      agingFlag = PoAgingFlag.RED;
    }

    const shouldNotify =
      (agingFlag === PoAgingFlag.WARNING || agingFlag === PoAgingFlag.RED) && line.lastAgingNotifiedFlag !== agingFlag;

    return {
      poLineId: line.id,
      agingFlag,
      daysOpen,
      allowedOpenDays: line.allowedOpenDays,
      shouldNotify,
    };
  }
}
