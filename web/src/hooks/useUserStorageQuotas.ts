import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface UserStorageQuota {
  directory: string;
  used: string;
  softQuota: string | null;
  hardQuota: string | null;
  grace: string | null;
  filesUsed: number | null;
  filesSoftLimit: number | null;
  filesHardLimit: number | null;
  filesGrace: string | null;
}

export interface UserStorageQuotasData {
  username: string;
  quotas: UserStorageQuota[];
  canSeeOwner: boolean;
}

export function useUserStorageQuotas(username: string | undefined) {
  return useQuery({
    queryKey: ["user-storage-quotas", username],
    queryFn: async () => {
      const response = await (
        apiClient.storageSpaces as any
      ).storageSpacesControllerGetUserStorageQuotas({ username });
      return response.data as UserStorageQuotasData;
    },
    enabled: !!username,
    retry: false,
  });
}
