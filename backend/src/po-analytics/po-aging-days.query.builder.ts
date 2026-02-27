import { Prisma } from '@prisma/client';
import { PoAgingFilterDto } from './dto/po-filter.dto';

export function buildPoAgingWhere(query: PoAgingFilterDto): Prisma.PurchaseOrderLineWhereInput {
  // Destructure with explicit types if necessary to satisfy strict linting
  const {
    searchPM,
    searchDUID,
    searchPONumber,
    searchProjectCode,
    searchProjectName,
    agingFlag,
    invoiceStatus,
    poType,
    year,
    month,
    day,
    startDate,
    endDate,
  } = query;

  const conditions: Prisma.PurchaseOrderLineWhereInput[] = [];

  if (searchPM) conditions.push({ pm: { contains: searchPM, mode: 'insensitive' } });
  if (searchDUID) conditions.push({ purchaseOrder: { duid: { contains: searchDUID, mode: 'insensitive' } } });
  if (searchPONumber)
    conditions.push({ purchaseOrder: { poNumber: { contains: searchPONumber, mode: 'insensitive' } } });
  if (searchProjectCode)
    conditions.push({ purchaseOrder: { projectCode: { contains: searchProjectCode, mode: 'insensitive' } } });
  if (searchProjectName)
    conditions.push({ purchaseOrder: { projectName: { contains: searchProjectName, mode: 'insensitive' } } });

  if (agingFlag && agingFlag !== 'all') {
    conditions.push({ agingFlag: agingFlag });
  }
  if (invoiceStatus && invoiceStatus !== 'all') {
    conditions.push({ poLineStatus: invoiceStatus });
  }
  if (poType && poType !== 'all') {
    conditions.push({ poType: { code: poType } });
  }

  if (startDate && endDate) {
    conditions.push({
      poIssuedDate: { gte: new Date(startDate), lte: new Date(endDate) },
    });
  } else if (year) {
    // Cast to number to resolve 'unsafe argument' errors
    const y = year;
    const m = (month as number) || 1;
    const d = (day as number) || 1;

    const start = new Date(y, m - 1, d);
    const end = day
      ? new Date(y, m - 1, d, 23, 59, 59)
      : month
        ? new Date(y, m, 0, 23, 59, 59)
        : new Date(y, 11, 31, 23, 59, 59);
    conditions.push({ poIssuedDate: { gte: start, lte: end } });
  }

  return {
    AND: conditions,
  };
}
