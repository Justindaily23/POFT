import { PoAgingFlag, PoLineStatus, Prisma } from '@prisma/client';

export type DateFilterMode = 'year' | 'month' | 'day' | 'range' | 'all';

export interface PoAgingDaysResponse {
  id: string;
  duid: string;
  poNumber: string;
  prNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  pmId: string;
  poLineNumber: string;
  poLineAmount: number; // Added to match DTO
  poType: string;
  poIssuedDate: Date;
  poInvoiceDate?: Date | null;
  allowedOpenDays: number;
  numberOfDaysOpen: number;
  agingFlag: PoAgingFlag;
  lastAgingNotifiedFlag?: PoAgingFlag | null;
  itemCode: string;
  itemDescription: string;
  poInvoiceStatus: PoLineStatus;
}

export interface PoAgingDuidCardsPaginatedResponse {
  data: DuidGroupDto[];
  nextCursor: string | null;
}

// This represents the PAGINATED wrapper
export interface PoAgingDaysPaginatedResponse {
  data: PoAgingDaysResponse[]; // Changed from PoAgingDaysItem to PoAgingDaysResponse
  nextCursor: string | null;
}

export interface PoAgingDashboardResponse {
  kpis: PoAgingKpiDto;
  duids: DuidGroupDto[];
  nextCursor: string | null;
  topCriticalProjects: CriticalProject[];
}

export interface CriticalProject {
  projectCode: string;
  projectName: string;
  pmName: string;
  totalPoValue: number;
  agingCount: number;
  status: PoAgingFlag;
}
export interface PoAgingKpiDto {
  totalPOs: number; // ✅ ADDED: Unique PO numbers count
  invoicedPOs: number;
  notInvoicedPOs: number;
  invoiceRate: number;
  avgPoAgingDays: number;
  totalPOLines?: number;
  criticalAgedPos: number; // ✅ Count of red-flagged elements

  // totalPoAmount?: number;
  // totalContractAmount?: number;
  // totalApprovedAmount?: number;
  // totalRemainingBalance?: number;
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
  totalPoAmount: number;
  totalContractAmount: number;
  totalApprovedAmount: number;
  totalRemainingBalance: number;
}

export interface PoGroupDto {
  poNumber: string;
  lines: PoAgingLineDto[];
  invoicedCount: number;
  notInvoicedCount: number;
  maxDaysOpen: number;
  worstAgingFlag: PoAgingFlag;
  totalPoAmount: number;
  totalContractAmount: number;
  totalApprovedAmount: number;
  totalRemainingBalance: number;
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
  poLineAmount: number;
  poType: string;
  poIssuedDate: Date;
  poInvoiceDate?: Date | null;
  allowedOpenDays: number;
  numberOfDaysOpen: number;
  agingFlag: PoAgingFlag;
  lastAgingNotifiedFlag?: PoAgingFlag | null;
  itemCode: string;
  itemDescription: string;
  poInvoiceStatus: PoLineStatus;
  contractAmount: number;
  totalRequestedAmount: number;
  totalApprovedAmount: number;
  remainingBalance: number;
}

export interface PoAgingKpiResponse {
  totalOpen: number;
  green: number;
  warning: number;
  red: number;
  invoiced: number;
  notInvoiced: number;
}

export interface PoAgingDaysQuery {
  search?: string;

  poType?: string;
  invoiceStatus: PoLineStatus;
  agingFlag: PoAgingFlag;

  year?: number;
  month?: number;
  day?: number;
  startDate?: string;
  endDate?: string;

  cursor?: string;
  limit?: number;
}

export interface KPIMetrics {
  totalPOs: number;
  invoicedPOs: number;
  notInvoicedPOs: number;
  invoiceRate: number; // as percentage
  avgPoAgingDays: number;
}

export type PoLineWithRelations = Prisma.PurchaseOrderLineGetPayload<{
  include: {
    purchaseOrder: true; // This gives you duid, poNumber, projectName, etc.
    poType: { select: { code: true } };
  };
}>;
