import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  ArchivedJobDTO,
  ArchivedJobsListDTO,
  MetaDto,
} from "@/lib/generated-api";

export type ArchivedJob = ArchivedJobDTO;

export type ArchivedJobsFilter = {
  job: string;
  name: string;
  queue: string;
  pbsServer: string;
  cpusFrom: string;
  cpusTo: string;
  gpusFrom: string;
  gpusTo: string;
  walltimeFrom: string;
  walltimeTo: string;
  runtimeFrom: string;
  runtimeTo: string;
  recordFrom: string;
  recordTo: string;
  createdFrom: string;
  createdTo: string;
  startedFrom: string;
  startedTo: string;
};

export type ArchivedRangePreset = "24h" | "48h" | "week" | "month";

type ArchivedJobsResponse = {
  data: ArchivedJobsListDTO;
  meta?: MetaDto;
};

interface UseArchivedJobsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  lastCount?: number;
  range?: ArchivedRangePreset | null;
  search?: string;
  username?: string;
  filter?: Partial<ArchivedJobsFilter>;
  enabled?: boolean;
}

const toIsoDate = (value?: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const toNumber = (value?: string): number | undefined => {
  if (!value?.trim()) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export function useArchivedJobs(params: UseArchivedJobsParams = {}) {
  const {
    page = 1,
    limit = 20,
    sort = "endedAt",
    order = "desc",
    lastCount,
    range,
    search,
    username,
    filter,
    enabled = true,
  } = params;

  return useQuery<ArchivedJobsResponse>({
    queryKey: [
      "archivedJobs",
      page,
      limit,
      sort,
      order,
      lastCount,
      range,
      search,
      username,
      filter,
    ],
    queryFn: async () => {
      const response = await apiClient.accounting.accountingControllerGetArchivedJobs(
        {
          page,
          limit,
          sort,
          order,
          lastCount,
          range: range ?? undefined,
          search,
          username,
          ...filter,
          cpusFrom: toNumber(filter?.cpusFrom),
          cpusTo: toNumber(filter?.cpusTo),
          gpusFrom: toNumber(filter?.gpusFrom),
          gpusTo: toNumber(filter?.gpusTo),
          // datetime-local values have no timezone - send them as ISO in the browser's zone
          recordFrom: toIsoDate(filter?.recordFrom),
          recordTo: toIsoDate(filter?.recordTo),
          createdFrom: toIsoDate(filter?.createdFrom),
          createdTo: toIsoDate(filter?.createdTo),
          startedFrom: toIsoDate(filter?.startedFrom),
          startedTo: toIsoDate(filter?.startedTo),
        }
      );
      return response;
    },
    enabled,
  });
}

// The job filter is matched with SQL LIKE - escape wildcards to match the ID literally
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, "\\$&");

/**
 * Single archived job looked up by its exact job ID.
 * Returns null when no accounting record exists for the job.
 */
export function useArchivedJob(jobId: string) {
  return useQuery<ArchivedJob | null>({
    queryKey: ["archivedJob", jobId],
    queryFn: async () => {
      const response = await apiClient.accounting.accountingControllerGetArchivedJobs(
        {
          page: 1,
          limit: 1,
          sort: "endedAt",
          order: "desc",
          job: escapeLike(jobId),
        }
      );
      return response.data?.jobs?.[0] ?? null;
    },
    enabled: !!jobId,
  });
}
