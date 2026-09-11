import { PoLineStatus, PoAgingFlag } from '@prisma/client';
import { DuidGroupDto, PoAgingLineDto, PoGroupDto } from './po-analytics-types/poAgingDaysResponse.type';

/**
 * PURE AGGREGATOR FUNCTION
 * Logic: Aggregates flat PO lines into a hierarchical structure and derives Critical Projects.
 */
export function aggregatePoAgingDashboard(lines: PoAgingLineDto[]) {
  const duidMap = new Map<string, DuidGroupDto>();
  const poLookupMap = new Map<string, Map<string, PoGroupDto>>();

  // 1. Initialize Global Workflow KPI Trackers (No more global finance accumulators)
  let totalDays = 0;
  const globalDistinctPOs = new Set<string>(); // ✅ TRACKS UNIQUE PO NUMBERS
  let globalInvoicedLines = 0;
  let globalNotInvoicedLines = 0;

  for (const line of lines) {
    const { duid: duidId, poNumber, poInvoiceStatus, agingFlag, numberOfDaysOpen, projectCode, projectName } = line;

    // Update Global Workflow KPI Counters
    totalDays += numberOfDaysOpen;
    globalDistinctPOs.add(poNumber); // ✅ Collect unique POs

    if (poInvoiceStatus === PoLineStatus.INVOICED) globalInvoicedLines++;
    if (poInvoiceStatus === PoLineStatus.NOT_INVOICED) globalNotInvoicedLines++;

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
        totalPoAmount: 0,
        totalContractAmount: 0,
        totalApprovedAmount: 0,
        totalRemainingBalance: 0,
      });
      poLookupMap.set(duidId, new Map<string, PoGroupDto>());
    }

    const duidGroup = duidMap.get(duidId)!;
    const duidPOs = poLookupMap.get(duidId)!;
    const poLineAmount = Number(line.poLineAmount) || 0;
    const contractAmount = Number(line.contractAmount) || 0;
    const approvedAmount = Number(line.totalApprovedAmount) || 0;
    const remainingBalance = Number(line.remainingBalance) || 0;

    // 3. Update DUID-level Metrics (Financials remain inside the specific card groups)
    duidGroup.totalLines++;
    duidGroup.maxDaysOpen = Math.max(duidGroup.maxDaysOpen, numberOfDaysOpen);
    duidGroup.totalPoAmount += poLineAmount;
    duidGroup.totalContractAmount += contractAmount;
    duidGroup.totalApprovedAmount += approvedAmount;
    duidGroup.totalRemainingBalance += remainingBalance;

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
        totalPoAmount: 0,
        totalContractAmount: 0,
        totalApprovedAmount: 0,
        totalRemainingBalance: 0,
      };
      duidPOs.set(poNumber, po);
      duidGroup.pos.push(po);
    }

    // 5. Update PO-level Metrics
    po.lines.push(line);
    po.maxDaysOpen = Math.max(po.maxDaysOpen, numberOfDaysOpen);
    po.totalPoAmount += poLineAmount;
    po.totalContractAmount += contractAmount;
    po.totalApprovedAmount += approvedAmount;
    po.totalRemainingBalance += remainingBalance;

    if (poInvoiceStatus === PoLineStatus.INVOICED) po.invoicedCount++;
    if (poInvoiceStatus === PoLineStatus.NOT_INVOICED) po.notInvoicedCount++;

    if (agingFlag === PoAgingFlag.RED) {
      po.worstAgingFlag = PoAgingFlag.RED;
    } else if (agingFlag === PoAgingFlag.WARNING && po.worstAgingFlag !== PoAgingFlag.RED) {
      po.worstAgingFlag = PoAgingFlag.WARNING;
    }
  }

  const totalLinesCount = lines.length;
  const allDuidGroups = Array.from(duidMap.values());

  // 6. DERIVE TOP CRITICAL PROJECTS (FOR SIDEBAR)
  const topCriticalProjects = allDuidGroups
    .filter((group) => group.worstAgingFlag !== PoAgingFlag.GREEN)
    .sort((a, b) => b.maxDaysOpen - a.maxDaysOpen)
    .slice(0, 20)
    .map((group) => {
      return {
        projectCode: group.projectCode,
        projectName: group.projectName,
        pmName: group.pos[0]?.lines[0]?.pm || 'N/A',
        totalPoValue: group.totalPoAmount,
        agingCount: group.totalLines,
        status: group.worstAgingFlag,
      };
    });

  return {
    kpis: {
      totalPOs: globalDistinctPOs.size, // ✅ McLean Unique PO Count
      invoicedPOs: globalInvoicedLines, // ✅ Count of invoiced lines
      notInvoicedPOs: globalNotInvoicedLines, // ✅ Count of non-invoiced lines
      avgPoAgingDays: totalLinesCount ? totalDays / totalLinesCount : 0, // ✅ Operational Average
      totalPOLines: totalLinesCount,
      criticalAgedPos: allDuidGroups.filter((g) => g.worstAgingFlag === PoAgingFlag.RED).length,
    },
    duids: allDuidGroups.sort((a, b) => b.maxDaysOpen - a.maxDaysOpen),
    topCriticalProjects,
  };
}
