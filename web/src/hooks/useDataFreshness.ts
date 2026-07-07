import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useDataFreshness() {
  return useQuery({
    queryKey: ["dataFreshness"],
    queryFn: async () => {
      const response =
        await apiClient.dataFreshness.dataFreshnessControllerGetDataTimestamps();
      return response.data;
    },
    refetchInterval: 60_000,
  });
}
