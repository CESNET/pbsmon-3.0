import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface UseJobsSummaryParams {
  state?: string;
  enabled?: boolean;
}

export function useJobsSummary(params: UseJobsSummaryParams = {}) {
  const {
    enabled = true,
  } = params;

  return useQuery({
    queryKey: ["jobsSummary"],
    queryFn: async () => {
      const response = await apiClient.jobs.jobsSummaryControllerGetJobsSummary();
      return response.data;
    },
    enabled,
  });
}
