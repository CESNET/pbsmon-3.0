import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const USER_ROLE = {
  ADMIN: "admin",
  STATISTICS: "statistics",
  USER: "user",
} as const;

/**
 * Whether the role may read statistics (statistics role or admin).
 */
export function canReadStatistics(role: string | undefined | null): boolean {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.STATISTICS;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.auth.authControllerGetCurrentUser();
      return response.data;
    },
  });
}
