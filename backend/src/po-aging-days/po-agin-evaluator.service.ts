import { Injectable } from '@nestjs/common';
import { PoAgingFlag, PurchaseOrderLine } from '@prisma/client';

/**
 * Result returned after evaluating a single PO line.
 * This is a pure computation result — no DB side effects.
 */
export interface AgingEvaluationResult {
  poLineId: string; // PO line identifier
  agingFlag: PoAgingFlag; // Computed aging flag
  daysOpen: number; // How many days the PO line has been open
  allowedOpenDays: number; // SLA / allowed open days
  shouldNotify: boolean; // Whether a notification should be triggered
}

@Injectable()
export class PoAgingEvaluatorService {
  /**
   * Evaluates the aging status of a single PO line.
   *
   * IMPORTANT:
   * - This method is PURE (no DB writes, no notifications).
   * - It can safely be reused by cron jobs, reports, or APIs.
   */
  evaluate(
    line: Pick<PurchaseOrderLine, 'id' | 'poIssuedDate' | 'allowedOpenDays' | 'lastAgingNotifiedFlag'>,
  ): AgingEvaluationResult {
    /**
     * Guard clause:
     * If required aging data is missing, we fail gracefully.
     * We do NOT throw — bad data should not break the UI or cron jobs.
     */
    if (!line.poIssuedDate || !line.allowedOpenDays || line.allowedOpenDays <= 0) {
      return {
        poLineId: line.id,
        agingFlag: PoAgingFlag.GREEN,
        daysOpen: 0,
        allowedOpenDays: line.allowedOpenDays ?? 0,
        shouldNotify: false,
      };
    }

    /**
     * Calculate how many full days the PO line has been open.
     * We floor to avoid partial-day noise.
     */
    const today = new Date();
    const daysOpen = Math.max(0, Math.floor((today.getTime() - line.poIssuedDate.getTime()) / 86400000));

    /**
     * Determine aging percentage against allowed SLA days.
     */
    const agingPercentage = (daysOpen / line.allowedOpenDays) * 100;

    /**
     * Default aging flag.
     * GREEN means within safe operating limits.
     */
    let agingFlag: PoAgingFlag = PoAgingFlag.GREEN;

    /**
     * WARNING:
     * 70% → 100% of allowed open days
     */
    if (agingPercentage > 70 && agingPercentage <= 100) {
      agingFlag = PoAgingFlag.WARNING;
    }

    /**
     * RED:
     * Exceeded allowed open days
     */
    if (agingPercentage > 100) {
      agingFlag = PoAgingFlag.RED;
    }

    /**
     * Notification rules:
     * - Only WARNING or RED
     * - Only once per flag change
     */
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
