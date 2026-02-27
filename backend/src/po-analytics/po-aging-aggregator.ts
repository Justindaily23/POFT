import { PoLineStatus, PoAgingFlag } from '@prisma/client';
import { DuidGroupDto, PoAgingLineDto, PoGroupDto } from './po-analytics-types/poAgingDaysResponse.type';

/**
 * PURE AGGREGATOR FUNCTION
 * Logic: Aggregates flat PO lines into a hierarchical structure and derives Critical Projects.
 */
export function aggregatePoAgingDashboard(lines: PoAgingLineDto[]) {
  const duidMap = new Map<string, DuidGroupDto>();
  const poLookupMap = new Map<string, Map<string, PoGroupDto>>();

  let totalDays = 0;
  let globalInvoiced = 0;
  let globalNotInvoiced = 0;

  for (const line of lines) {
    const { duid: duidId, poNumber, poInvoiceStatus, agingFlag, numberOfDaysOpen, projectCode, projectName } = line;

    // 1. Update Global KPI Counters
    totalDays += numberOfDaysOpen;
    if (poInvoiceStatus === PoLineStatus.INVOICED) globalInvoiced++;
    if (poInvoiceStatus === PoLineStatus.NOT_INVOICED) globalNotInvoiced++;

    // 2. Initialize DUID Group
    if (!duidMap.has(duidId)) {
      duidMap.set(duidId, {
        duid: duidId,
        projectCode,
        projectName,
        pos: [],
        totalLines: 0,
        totalInvoiced: 0,
        totalNotInvoiced: 0,
        maxDaysOpen: 0,
        worstAgingFlag: PoAgingFlag.GREEN,
      });
      poLookupMap.set(duidId, new Map<string, PoGroupDto>());
    }

    const duidGroup = duidMap.get(duidId)!;
    const duidPOs = poLookupMap.get(duidId)!;

    // 3. Update DUID-level Metrics
    duidGroup.totalLines++;
    duidGroup.maxDaysOpen = Math.max(duidGroup.maxDaysOpen, numberOfDaysOpen);

    if (poInvoiceStatus === PoLineStatus.INVOICED) duidGroup.totalInvoiced++;
    if (poInvoiceStatus === PoLineStatus.NOT_INVOICED) duidGroup.totalNotInvoiced++;

    // Escalate DUID Flag
    if (agingFlag === PoAgingFlag.RED) {
      duidGroup.worstAgingFlag = PoAgingFlag.RED;
    } else if (agingFlag === PoAgingFlag.WARNING && duidGroup.worstAgingFlag !== PoAgingFlag.RED) {
      duidGroup.worstAgingFlag = PoAgingFlag.WARNING;
    }

    // 4. Initialize/Get PO Group
    let po = duidPOs.get(poNumber);
    if (!po) {
      po = {
        poNumber,
        lines: [],
        invoicedCount: 0,
        notInvoicedCount: 0,
        maxDaysOpen: 0,
        worstAgingFlag: PoAgingFlag.GREEN,
      };
      duidPOs.set(poNumber, po);
      duidGroup.pos.push(po);
    }

    // 5. Update PO-level Metrics
    po.lines.push(line);
    po.maxDaysOpen = Math.max(po.maxDaysOpen, numberOfDaysOpen);

    if (poInvoiceStatus === PoLineStatus.INVOICED) po.invoicedCount++;
    if (poInvoiceStatus === PoLineStatus.NOT_INVOICED) po.notInvoicedCount++;

    if (agingFlag === PoAgingFlag.RED) {
      po.worstAgingFlag = PoAgingFlag.RED;
    } else if (agingFlag === PoAgingFlag.WARNING && po.worstAgingFlag !== PoAgingFlag.RED) {
      po.worstAgingFlag = PoAgingFlag.WARNING;
    }
  }

  const totalCount = lines.length;
  const allDuidGroups = Array.from(duidMap.values());

  // 6. DERIVE TOP CRITICAL PROJECTS (FOR SIDEBAR)
  // Filters for RED/WARNING and sorts by the highest number of days open.
  const topCriticalProjects = allDuidGroups
    .filter((group) => group.worstAgingFlag !== PoAgingFlag.GREEN)
    .sort((a, b) => b.maxDaysOpen - a.maxDaysOpen)
    .slice(0, 20)
    .map((group) => {
      // 🛡️ FINANCE TRUTH: Aggregate all monetary values for this DUID group
      const totalPoValue = group.pos.reduce((poTotal, po) => {
        return (
          poTotal +
          po.lines.reduce((lineTotal, line) => {
            // Convert Decimal/String to Number for the Frontend
            return lineTotal + (Number(line.poLineAmount) || 0);
          }, 0)
        );
      }, 0);

      return {
        projectCode: group.projectCode,
        projectName: group.projectName,
        // Grab PM from the first available line in the group
        pmName: group.pos[0]?.lines[0]?.pm || 'N/A',
        totalPoValue, // ✅ Now mapped to the number your UI expects
        agingCount: group.totalLines,
        status: group.worstAgingFlag,
      };
    });

  return {
    kpis: {
      invoicedPOs: globalInvoiced,
      notInvoicedPOs: globalNotInvoiced,
      invoiceRate: totalCount ? (globalInvoiced / totalCount) * 100 : 0,
      avgPoAgingDays: totalCount ? totalDays / totalCount : 0,
      totalPOLines: totalCount,
      criticalAgedPos: allDuidGroups.filter((g) => g.worstAgingFlag === PoAgingFlag.RED).length,
    },
    duids: allDuidGroups.sort((a, b) => b.maxDaysOpen - a.maxDaysOpen),
    topCriticalProjects, // 👈 KEY FIX: Now returned to the frontend
  };
}
