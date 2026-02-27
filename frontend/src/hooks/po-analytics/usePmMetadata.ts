import apiClient from "@/api/auth/axios";
import type { PoType } from "@/types/po-analytics/po-analytics.types";
import { useQuery } from "@tanstack/react-query";

// hooks/po-analytics/usePmMetadata.ts
export function usePmPoTypes() {
  return useQuery<PoType[]>({
    queryKey: ["pm-po-types"],
    queryFn: async () => {
      // 🚀 Hit the PM-specific route to avoid the 403
      const { data } = await apiClient.get("/metadata/po-types");
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });
}
