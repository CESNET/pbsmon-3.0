import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface UseQueuesParams {
  user?: string;
  server?: string;
  qType?: string;
  search?: string;
  enabled?: boolean;
}

export function useQueues(params: UseQueuesParams = {}) {
  const { user, server, qType, search, enabled = true } = params;
  return useQuery({
    queryKey: ["queues", user, server, qType, search],
    queryFn: async () => {
      const response = await apiClient.queues.queuesControllerGetQueues({
        user,
        server,
        qType,
        search,
      });
      return response.data;
    },
    enabled,
  });
}
