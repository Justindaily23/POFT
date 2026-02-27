import type { PoAgingLineDto } from "@/types/po-analytics/po-analytics.types";

export interface KPIMetrics {
  totalPOs: number;
  invoicedPOs: number;
  notInvoicedPOs: number;
  invoiceRate: number;
  avgPoAgingDays: number;
}

/**
 * Calculate KPIs from a list of POs.
 */
export const calculatePoKPI = (poData: PoAgingLineDto[]): KPIMetrics => {
  if (poData.length === 0) {
    return {
      totalPOs: 0,
      invoicedPOs: 0,
      notInvoicedPOs: 0,
      invoiceRate: 0,
      avgPoAgingDays: 0,
    };
  }

  // ✅ FIX: Access properties defined in PoAgingLineDto
  const invoiced = poData.filter((po) => po.poInvoiceStatus === "INVOICED").length;
  const notInvoiced = poData.filter((po) => po.poInvoiceStatus === "NOT_INVOICED").length;
  const avgDays = poData.reduce((sum, po) => sum + po.numberOfDaysOpen, 0) / poData.length;

  return {
    totalPOs: poData.length,
    invoicedPOs: invoiced,
    notInvoicedPOs: notInvoiced,
    invoiceRate: (invoiced / poData.length) * 100,
    avgPoAgingDays: avgDays,
  };
};
