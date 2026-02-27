/**
 * Erasable-safe Status Types
 */

export interface CriticalProject {
  id: string;
  projectCode: string;
  projectName: string;
  pmName: string;
  totalPoValue: number;
  agingCount: number; // e.g., how many PO lines are RED/WARNING
  status: PoAgingFlag; // Reuse your existing GREEN/WARNING/RED enum
}

export interface PoAgingDashboardResponse {
  kpis: PoAgingKpiDto;
  topCriticalProjects: CriticalProject[]; // No more 'any'
  duids: DuidGroupDto[];
}
export interface PoAgingDaysPaginatedResponse {
  data: PoAgingLineDto[]; // The array of PO lines
  nextCursor: string | null; // The ID of the last item for the next fetch
}

export interface PoAgingKpiDto {
  invoicedPOs: number;
  notInvoicedPOs: number;
  invoiceRate: number;
  avgPoAgingDays: number;
  totalPOLines: number;
  criticalAgedPos: number;
}

export interface DuidGroupDto {
  duid: string;
  projectCode: string;
  projectName: string;
  pos: PoGroupDto[];
  totalLines: number;
  totalInvoiced: number;
  totalNotInvoiced: number;
  maxDaysOpen: number;
  worstAgingFlag: PoAgingFlag;
}

export interface PoGroupDto {
  poNumber: string;
  lines: PoAgingLineDto[];
  invoicedCount: number;
  notInvoicedCount: number;
  maxDaysOpen: number;
  worstAgingFlag: PoAgingFlag;
}

export interface PoAgingLineDto {
  id: string;
  duid: string;
  poNumber: string;
  prNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  pmId: string;
  poLineNumber: string;
  poType: string;
  poIssuedDate: string | Date;
  poInvoiceDate?: string | Date | null;
  allowedOpenDays: number;
  numberOfDaysOpen: number;
  agingFlag: PoAgingFlag;
  itemCode: string;
  itemDescription: string;
  poInvoiceStatus: PoLineStatus;
}
export interface PaginationState {
  page: number;
  pageSize: number;
}

// types/po-analytics/po-analytics.types.ts

export type DateFilterMode = "all" | "year" | "month" | "day" | "range";

export interface PoAgingFilterState {
  // 1. Text Search (Matches Backend buildWhere)
  pmId: string;
  searchPM: string;
  searchDUID: string;
  searchPONumber: string;
  searchProjectCode: string;
  searchProjectName: string;

  // 2. Status Enums (Using our new Constants)
  agingFlag: PoAgingFlag | "all";
  invoiceStatus: PoLineStatus | "all";
  poType: string | "all";

  // 3. Temporal Logic (The "Analytics" secret sauce)
  dateMode: DateFilterMode;
  year?: number;
  month?: string; // "Jan", "Feb", etc.
  day?: number;
  rangeStart?: string; // ISO String
  rangeEnd?: string; // ISO String

  // 4. Pagination
  page: number;
  take: number;
  cursor?: string; // 👈 Add this for the backend ID-based fetch
}

export interface PoType {
  id: string;
  code: string;
  name: string;
}

// 1. Define the object first
export const PoLineStatus = {
  INVOICED: "INVOICED",
  NOT_INVOICED: "NOT_INVOICED",
} as const;

// 2. Define the type second (using the object name)
export type PoLineStatus = (typeof PoLineStatus)[keyof typeof PoLineStatus];

// 3. Define the labels (using the type)
export const PO_LINE_STATUS_LABELS: Record<PoLineStatus, string> = {
  [PoLineStatus.INVOICED]: "Invoiced",
  [PoLineStatus.NOT_INVOICED]: "Not Invoiced",
};

// --- Repeat for Aging Flag ---

export const PoAgingFlag = {
  GREEN: "GREEN",
  WARNING: "WARNING",
  RED: "RED",
} as const;

export type PoAgingFlag = (typeof PoAgingFlag)[keyof typeof PoAgingFlag];

export const PO_AGING_FLAG_LABELS: Record<PoAgingFlag, string> = {
  [PoAgingFlag.GREEN]: "On Track",
  [PoAgingFlag.WARNING]: "Warning",
  [PoAgingFlag.RED]: "Critical",
};
