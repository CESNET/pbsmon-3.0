import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  StatisticsAccessDTO,
  StatisticsGraphChartDTO,
  StatisticsGraphDataDTO,
  StatisticsOrganizationDTO,
} from "@/lib/generated-api";

// Option lists change rarely, keep them cached for a while
const STATISTICS_OPTIONS_STALE_TIME = 10 * 60 * 1000;

/**
 * What the current user may see in statistics: the clusters and users they
 * are limited to (not present = not limited). Fails with 403 when the user
 * has no access to statistics.
 */
export function useStatisticsAccess(enabled = true) {
  return useQuery<StatisticsAccessDTO>({
    queryKey: ["statistics", "access"],
    queryFn: async () => {
      const response =
        await apiClient.accounting.accountingControllerGetStatisticsAccess();
      return response.data;
    },
    enabled,
    staleTime: STATISTICS_OPTIONS_STALE_TIME,
    retry: false,
  });
}

export function useStatisticsClusters(enabled = true) {
  return useQuery<string[]>({
    queryKey: ["statistics", "clusters"],
    queryFn: async () => {
      const response =
        await apiClient.accounting.accountingControllerGetStatisticsClusters();
      return (response.data || []).map(String);
    },
    enabled,
    staleTime: STATISTICS_OPTIONS_STALE_TIME,
    retry: false,
  });
}

export function useStatisticsQueues(enabled = true) {
  return useQuery<string[]>({
    queryKey: ["statistics", "queues"],
    queryFn: async () => {
      const response =
        await apiClient.accounting.accountingControllerGetStatisticsQueues();
      return (response.data || []).map(String);
    },
    enabled,
    staleTime: STATISTICS_OPTIONS_STALE_TIME,
    retry: false,
  });
}

export function useStatisticsOrganizations(enabled = true) {
  return useQuery<StatisticsOrganizationDTO[]>({
    queryKey: ["statistics", "organizations"],
    queryFn: async () => {
      const response =
        await apiClient.accounting.accountingControllerGetStatisticsOrganizations();
      return response.data || [];
    },
    enabled,
    staleTime: STATISTICS_OPTIONS_STALE_TIME,
    retry: false,
  });
}

export interface StatisticsGraphRequest {
  graphId: string;
  params: Record<string, unknown>;
}

/** Fetches data of a statistics graph computed by the backend */
export function useStatisticsGraphData() {
  return useMutation<StatisticsGraphDataDTO, Error, StatisticsGraphRequest>({
    mutationFn: async ({ graphId, params }) => {
      const response =
        await apiClient.accounting.accountingControllerGetStatisticsGraph({
          graphId,
          requestBody: { params },
        });
      return response.data;
    },
  });
}

/** Fetches chart of a statistics graph rendered by the backend as SVG */
export function useStatisticsGraphChart() {
  return useMutation<StatisticsGraphChartDTO, Error, StatisticsGraphRequest>({
    mutationFn: async ({ graphId, params }) => {
      const response =
        await apiClient.accounting.accountingControllerGetStatisticsGraphChart({
          graphId,
          requestBody: { params },
        });
      return response.data;
    },
  });
}
