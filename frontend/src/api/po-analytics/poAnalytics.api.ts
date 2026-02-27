import apiClient from "../auth/axios";
import type {
  PoAgingDashboardResponse,
  PoAgingDaysPaginatedResponse,
  PoAgingFilterState,
} from "@/types/po-analytics/po-analytics.types";

/**
 * Ensures params match the NestJS PoAgingFilterDto
 * Strips empty strings to avoid 400 Validation Errors
 */
const getCleanParams = (params: PoAgingFilterState) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let month = params.month;
  if (typeof month === "string" && months.includes(month)) {
    month = (months.indexOf(month) + 1).toString();
  }

  // Use a Record with allowed primitive types instead of 'any'
  const cleaned: Record<string, string | number | boolean | undefined> = {};

  const rawEntries = {
    ...params,
    month,
    startDate: params.rangeStart || undefined,
    endDate: params.rangeEnd || undefined,
  };

  Object.entries(rawEntries).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      cleaned[key] = value as string | number | boolean;
    }
  });

  delete cleaned.rangeStart;
  delete cleaned.rangeEnd;

  return cleaned;
};

// PM Dashboard
export const fetchPmDashboard = async (params: PoAgingFilterState) => {
  const { data } = await apiClient.get<PoAgingDashboardResponse>("/pm-analytics/dashboard", {
    params: getCleanParams(params),
  });
  return data;
};

// PM Aging List
export const fetchPmAgingList = async (params: PoAgingFilterState) => {
  const { data } = await apiClient.get<PoAgingDaysPaginatedResponse>("/pm-analytics/aging-list", {
    params: { ...getCleanParams(params), take: 15 },
  });
  return data;
};

// Admin KPIs
export const fetchPoAgingDashboard = async (params: PoAgingFilterState) => {
  const { data } = await apiClient.get<PoAgingDashboardResponse>("/analytics/kpis", {
    params: getCleanParams(params),
  });
  return data;
};

// Admin Table
export const fetchPoAgingTable = async (params: PoAgingFilterState) => {
  const { data } = await apiClient.get<PoAgingDaysPaginatedResponse>("/analytics", {
    params: getCleanParams(params),
  });
  return data;
};
