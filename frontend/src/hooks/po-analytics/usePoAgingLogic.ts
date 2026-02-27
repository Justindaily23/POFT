import { useMemo } from "react";
import {
  type PoAgingLineDto,
  PoLineStatus,
  PoAgingFlag,
  type DuidGroupDto,
} from "@/types/po-analytics/po-analytics.types";

export const usePoAgingLogic = (filteredData: PoAgingLineDto[]) => {
  // ─────────────────────────────────────────────
  // 1. COMPUTE KPI METRICS
  // ─────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (filteredData.length === 0) {
      return { invoicedPOs: 0, notInvoicedPOs: 0, invoiceRate: 0, avgPoAgingDays: 0 };
    }

    // Use the Enum instead of raw strings for safety
    const invoiced = filteredData.filter(
      (po) => po.poInvoiceStatus === PoLineStatus.INVOICED,
    ).length;
    const notInvoiced = filteredData.filter(
      (po) => po.poInvoiceStatus === PoLineStatus.NOT_INVOICED,
    ).length;

    const avgDays =
      filteredData.reduce((sum, po) => sum + po.numberOfDaysOpen, 0) / filteredData.length;

    return {
      invoicedPOs: invoiced,
      notInvoicedPOs: notInvoiced,
      invoiceRate: (invoiced / filteredData.length) * 100,
      avgPoAgingDays: avgDays,
    };
  }, [filteredData]);

  // ─────────────────────────────────────────────
  // 2. HIERARCHICAL GROUPING (DUID -> PO -> Lines)
  // ─────────────────────────────────────────────
  const groupedByDUID = useMemo(() => {
    // Use the DuidGroupDto type for the map to catch property errors early
    const duidMap: Record<string, DuidGroupDto> = {};

    filteredData.forEach((po) => {
      // Initialize DUID Level
      if (!duidMap[po.duid]) {
        duidMap[po.duid] = {
          duid: po.duid,
          pos: [],
          totalLines: 0,
          totalInvoiced: 0,
          totalNotInvoiced: 0,
          maxDaysOpen: 0,
          worstAgingFlag: PoAgingFlag.GREEN,
          projectCode: po.projectCode,
          projectName: po.projectName,
        };
      }

      const duidGroup = duidMap[po.duid];

      // Initialize/Find PO Level
      let poGroup = duidGroup.pos.find((p) => p.poNumber === po.poNumber);
      if (!poGroup) {
        poGroup = {
          poNumber: po.poNumber,
          lines: [],
          invoicedCount: 0,
          notInvoicedCount: 0,
          maxDaysOpen: 0,
          worstAgingFlag: PoAgingFlag.GREEN,
        };
        duidGroup.pos.push(poGroup);
      }

      // Add Line and Update Metrics
      poGroup.lines.push(po);
      duidGroup.totalLines++;

      if (po.poInvoiceStatus === PoLineStatus.INVOICED) {
        poGroup.invoicedCount++;
        duidGroup.totalInvoiced++;
      } else {
        poGroup.notInvoicedCount++;
        duidGroup.totalNotInvoiced++;
      }

      // Update Aging Logic (Max Days)
      if (po.numberOfDaysOpen > poGroup.maxDaysOpen) poGroup.maxDaysOpen = po.numberOfDaysOpen;
      if (po.numberOfDaysOpen > duidGroup.maxDaysOpen) duidGroup.maxDaysOpen = po.numberOfDaysOpen;

      // Update Worst Flag Logic using your priority mapping
      const flagPriority: Record<PoAgingFlag, number> = {
        [PoAgingFlag.RED]: 3,
        [PoAgingFlag.WARNING]: 2,
        [PoAgingFlag.GREEN]: 1,
      };

      const currentFlagPriority = flagPriority[po.agingFlag] || 0;

      // Update PO Level Flag
      if (currentFlagPriority > flagPriority[poGroup.worstAgingFlag]) {
        poGroup.worstAgingFlag = po.agingFlag;
      }
      // Update DUID Level Flag
      if (currentFlagPriority > flagPriority[duidGroup.worstAgingFlag]) {
        duidGroup.worstAgingFlag = po.agingFlag;
      }
    });

    // Return sorted by most urgent (Max Days Open)
    return Object.values(duidMap).sort((a, b) => b.maxDaysOpen - a.maxDaysOpen);
  }, [filteredData]);

  return { metrics, groupedByDUID };
};
