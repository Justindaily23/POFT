//useTypes.ts
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/auth/axios";
import {
  type PoType,
  PoLineStatus,
  PO_LINE_STATUS_LABELS,
  PoAgingFlag,
  PO_AGING_FLAG_LABELS,
} from "@/types/po-analytics/po-analytics.types";

export function usePoMetadata() {
  return useQuery({
    queryKey: ["po-metadata"],
    queryFn: async () => {
      // Fetch both endpoints in parallel
      const [typesRes, metaRes] = await Promise.all([
        apiClient.get<PoType[]>("/metadata/po-types"),
        apiClient.get<{ lineStatuses: string[]; agingFlags: string[] }>("/metadata/enums"),
      ]);

      return {
        types: typesRes.data,
        // Map the raw strings from backend to your Label constants
        statuses: metaRes.data.lineStatuses.map((val) => ({
          value: val as PoLineStatus,
          label: PO_LINE_STATUS_LABELS[val as PoLineStatus] || val,
        })),
        agingFlags: metaRes.data.agingFlags.map((val) => ({
          value: val as PoAgingFlag,
          label: PO_AGING_FLAG_LABELS[val as PoAgingFlag] || val,
        })),
      };
    },
    staleTime: 1000 * 60 * 60,
  });
}
