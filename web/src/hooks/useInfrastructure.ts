import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  InfrastructureFiltersDTO,
  InfrastructureOrganizationListDTO,
  MetaDto,
} from "@/lib/generated-api";

type InfrastructureFilterablesResponse = {
  data: InfrastructureFiltersDTO;
  meta?: MetaDto;
};

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
  filters?: string;
}

export function useInfrastructureFilterables() {
  return useQuery<InfrastructureFilterablesResponse>({
    queryKey: ["infrastructure", "filters"],
    queryFn: async () => {
      const response =
        await apiClient.infrastructure.infrastructureControllerGetInfrastructureFilters();
      return response;
    },
  });
}

export function useInfrastructure(params: UseInfrastructureParams = {}) {
  const {
    search,
    filters,
  } = params;
  return useQuery<InfrastructureListResponse>({
    queryKey: [
      "infrastructure",
      search,
      filters,
    ],
    queryFn: async () => {
      const response =
        await apiClient.infrastructure.infrastructureControllerGetInfrastructure({
          search,
          filters,
        });
      return response;
    },
  });
}
