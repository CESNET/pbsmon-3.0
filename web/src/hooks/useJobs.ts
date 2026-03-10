import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { JobsListDTO, JobsListMetaDto } from "@/lib/generated-api";

type JobsListResponse = {
  data: JobsListDTO;
  meta?: JobsListMetaDto;
};

interface UseJobsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  state?: string;
  node?: string;
  queue?: string;
  comment?: string;
  owner?: string;
  enabled?: boolean;
}

export function useJobs(params: UseJobsParams = {}) {
  const {
    page = 1,
    limit = 20,
    sort = "createdAt",
    order = "desc",
    search,
    state,
    node,
    queue,
    comment,
    owner,
    enabled = true,
  } = params;

  return useQuery<JobsListResponse>({
    queryKey: [
      "jobs",
      page,
      limit,
      sort,
      order,
      search,
      state,
      node,
      queue,
      comment,
      owner,
    ],
    queryFn: async () => {
      const response = await apiClient.jobs.jobsControllerGetJobs({
        page,
        limit,
        sort,
        order,
        search,
        state,
        node,
        queue,
        comment,
        owner,
      });
      return response;
    },
    enabled,
  });
}
