import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/axios";

export interface PoType {
    id: string;
    name: string;
    code: string;
}

export function usePoTypes() {
    return useQuery<PoType[]>({
        queryKey: ["po-types"],
        queryFn: async () => {
            // This matches your @Get('types') endpoint
            const { data } = await apiClient.get("/po-workspace/types");
            return data;
        },
        // Since these are seeded database values, they don't change often.
        // Setting a long staleTime prevents unnecessary network requests.
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
