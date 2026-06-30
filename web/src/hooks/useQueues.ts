import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface UseQueuesParams {
  user?: string;
  server?: string;
  qType?: string;
  enabled?: boolean;
}

export function useQueues(params: UseQueuesParams = {}) {
  const { user, server, qType, enabled = true } = params;
  return useQuery({
    queryKey: ["queues", user, server, qType],
    queryFn: async () => {
      const response = await apiClient.queues.queuesControllerGetQueues({
        user,
        server,
        qType,
      });
      return response.data;
    },
    enabled,
  });
}
