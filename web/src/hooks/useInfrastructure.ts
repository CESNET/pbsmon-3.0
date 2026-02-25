import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  InfrastructureOrganizationListDTO,
  MetaDto,
} from "@/lib/generated-api";

// Infrastructure meta extends MetaDto with additional fields
type InfrastructureListMetaDto = MetaDto & {
  totalOrganizations: number;
  totalClusters: number;
  totalNodes: number;
  totalCpu: number;
  totalGpu?: number | null;
  totalMemory?: number | null;
  freeNodes: number;
  partiallyUsedNodes: number;
  usedNodes: number;
  unknownNodes: number;
};

type InfrastructureListResponse = {
  data: InfrastructureOrganizationListDTO[];
  meta?: InfrastructureListMetaDto;
};

interface UseInfrastructureParams {
  search?: string;
}

export function useInfrastructure(params: UseInfrastructureParams = {}) {
  const {
    search,
  } = params;
  return useQuery<InfrastructureListResponse>({
    queryKey: [
      "infrastructure",
      search,

    ],
    queryFn: async () => {
      const response =
        await apiClient.infrastructure.infrastructureControllerGetInfrastructure({
          search,
        });
      return response;
    },
  });
}
