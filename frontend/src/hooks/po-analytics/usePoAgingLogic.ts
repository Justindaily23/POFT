import { useMemo } from "react";
import type { DuidGroupDto } from "@/types/po-analytics/po-analytics.types";

// ✅ The hook now receives the fully built DUID cards sent directly from the server V2 endpoint
export const usePoAgingLogic = (paginatedDuidCards: DuidGroupDto[]) => {
  return useMemo(() => {
    // 1. The main card list is already grouped and sorted by the backend database!
    const groupedByDUID = paginatedDuidCards;

    // 2. Return an empty metrics object here because your top KPIs are already
    // safely handled by the separate dashboard API endpoint.
    return {
      metrics: {
        totalPOs: 0,
        invoicedPOs: 0,
        notInvoicedPOs: 0,
        avgPoAgingDays: 0,
      },
      groupedByDUID,
    };
  }, [paginatedDuidCards]);
};

// import { useMemo } from "react";
// import { type PoAgingLineDto, PoLineStatus, PoAgingFlag, type DuidGroupDto } from "@/types/po-analytics/po-analytics.types";

// export const usePoAgingLogic = (filteredData: PoAgingLineDto[]) => {
//   // ─────────────────────────────────────────────
//   // 1. COMPUTE KPI METRICS
//   // ─────────────────────────────────────────────
//   const metrics = useMemo(() => {
//     if (filteredData.length === 0) {
//       return {
//         invoicedPOs: 0,
//         notInvoicedPOs: 0,
//         invoiceRate: 0,
//         avgPoAgingDays: 0,
//         totalPoAmount: 0,
//         totalContractAmount: 0,
//         totalApprovedAmount: 0,
//         totalRemainingBalance: 0,
//       };
//     }

//     // Use the Enum instead of raw strings for safety
//     const invoiced = filteredData.filter((po) => po.poInvoiceStatus === PoLineStatus.INVOICED).length;
//     const notInvoiced = filteredData.filter((po) => po.poInvoiceStatus === PoLineStatus.NOT_INVOICED).length;

//     const avgDays = filteredData.reduce((sum, po) => sum + po.numberOfDaysOpen, 0) / filteredData.length;

//     const totals = filteredData.reduce(
//       (acc, po) => {
//         acc.totalPoAmount += po.poLineAmount ?? 0;
//         acc.totalContractAmount += po.contractAmount ?? 0;
//         acc.totalApprovedAmount += po.totalApprovedAmount ?? 0;
//         acc.totalRemainingBalance += po.remainingBalance ?? 0;
//         return acc;
//       },
//       {
//         totalPoAmount: 0,
//         totalContractAmount: 0,
//         totalApprovedAmount: 0,
//         totalRemainingBalance: 0,
//       },
//     );

//     return {
//       invoicedPOs: invoiced,
//       notInvoicedPOs: notInvoiced,
//       invoiceRate: (invoiced / filteredData.length) * 100,
//       avgPoAgingDays: avgDays,
//       ...totals,
//     };
//   }, [filteredData]);

//   // ─────────────────────────────────────────────
//   // 2. HIERARCHICAL GROUPING (DUID -> PO -> Lines)
//   // ─────────────────────────────────────────────
//   const groupedByDUID = useMemo(() => {
//     // Use the DuidGroupDto type for the map to catch property errors early
//     const duidMap: Record<string, DuidGroupDto> = {};

//     filteredData.forEach((po) => {
//       // Initialize DUID Level
//       if (!duidMap[po.duid]) {
//         duidMap[po.duid] = {
//           duid: po.duid,
//           pos: [],
//           totalLines: 0,
//           totalInvoiced: 0,
//           totalNotInvoiced: 0,
//           maxDaysOpen: 0,
//           worstAgingFlag: PoAgingFlag.GREEN,
//           projectCode: po.projectCode,
//           projectName: po.projectName,
//           totalPoAmount: 0,
//           totalContractAmount: 0,
//           totalApprovedAmount: 0,
//           totalRemainingBalance: 0,
//         };
//       }

//       const duidGroup = duidMap[po.duid];

//       // Initialize/Find PO Level
//       let poGroup = duidGroup.pos.find((p) => p.poNumber === po.poNumber);
//       if (!poGroup) {
//         poGroup = {
//           poNumber: po.poNumber,
//           lines: [],
//           invoicedCount: 0,
//           notInvoicedCount: 0,
//           maxDaysOpen: 0,
//           worstAgingFlag: PoAgingFlag.GREEN,
//           totalPoAmount: 0,
//           totalContractAmount: 0,
//           totalApprovedAmount: 0,
//           totalRemainingBalance: 0,
//         };
//         duidGroup.pos.push(poGroup);
//       }

//       // Add Line and Update Metrics
//       poGroup.lines.push(po);
//       duidGroup.totalLines++;
//       duidGroup.totalPoAmount += po.poLineAmount ?? 0;
//       duidGroup.totalContractAmount += po.contractAmount ?? 0;
//       duidGroup.totalApprovedAmount += po.totalApprovedAmount ?? 0;
//       duidGroup.totalRemainingBalance += po.remainingBalance ?? 0;
//       poGroup.totalPoAmount += po.poLineAmount ?? 0;
//       poGroup.totalContractAmount += po.contractAmount ?? 0;
//       poGroup.totalApprovedAmount += po.totalApprovedAmount ?? 0;
//       poGroup.totalRemainingBalance += po.remainingBalance ?? 0;

//       if (po.poInvoiceStatus === PoLineStatus.INVOICED) {
//         poGroup.invoicedCount++;
//         duidGroup.totalInvoiced++;
//       } else {
//         poGroup.notInvoicedCount++;
//         duidGroup.totalNotInvoiced++;
//       }

//       // Update Aging Logic (Max Days)
//       if (po.numberOfDaysOpen > poGroup.maxDaysOpen) poGroup.maxDaysOpen = po.numberOfDaysOpen;
//       if (po.numberOfDaysOpen > duidGroup.maxDaysOpen) duidGroup.maxDaysOpen = po.numberOfDaysOpen;

//       // Update Worst Flag Logic using your priority mapping
//       const flagPriority: Record<PoAgingFlag, number> = {
//         [PoAgingFlag.RED]: 3,
//         [PoAgingFlag.WARNING]: 2,
//         [PoAgingFlag.GREEN]: 1,
//       };

//       const currentFlagPriority = flagPriority[po.agingFlag] || 0;

//       // Update PO Level Flag
//       if (currentFlagPriority > flagPriority[poGroup.worstAgingFlag]) {
//         poGroup.worstAgingFlag = po.agingFlag;
//       }
//       // Update DUID Level Flag
//       if (currentFlagPriority > flagPriority[duidGroup.worstAgingFlag]) {
//         duidGroup.worstAgingFlag = po.agingFlag;
//       }
//     });

//     // Return sorted by most urgent (Max Days Open)
//     return Object.values(duidMap).sort((a, b) => b.maxDaysOpen - a.maxDaysOpen);
//   }, [filteredData]);

//   return { metrics, groupedByDUID };
// };
