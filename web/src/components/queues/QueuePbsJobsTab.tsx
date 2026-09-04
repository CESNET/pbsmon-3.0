import { useTranslation } from "react-i18next";
import { useJobs } from "@/hooks/useJobs";
import { JobsTable } from "@/components/jobs/JobsTable";
import { Pagination } from "@/components/common/Pagination";
import { JobsSearchBar } from "@/components/jobs/JobsSearchBar";
import type { JobFilterableState } from "@/components/jobs/JobsFilterableHeader";

type SortColumn =
  | "id"
  | "name"
  | "queue"
  | "state"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

interface QueuePbsJobsTabProps {
  queueName: string;
  jobsPage: number;
  jobsLimit: number;
  jobsSort: SortColumn;
  jobsOrder: "asc" | "desc";
  jobsSearch: string;
  stateFilter: JobFilterableState;
  onJobsPageChange: (page: number) => void;
  onJobsPageSizeChange: (pageSize: number) => void;
  onJobsSort: (column: SortColumn) => void;
  onJobsSearchChange: (query: string) => void;
  onStateFilterChange: (state: JobFilterableState) => void;
}

export function QueuePbsJobsTab({
  queueName,
  jobsPage,
  jobsLimit,
  jobsSort,
  jobsOrder,
  jobsSearch,
  stateFilter,
  onJobsPageChange,
  onJobsPageSizeChange,
  onJobsSort,
  onJobsSearchChange,
  onStateFilterChange,
}: QueuePbsJobsTabProps) {
  const { t } = useTranslation();

  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
  } = useJobs({
    page: jobsPage,
    limit: jobsLimit,
    sort: jobsSort,
    order: jobsOrder,
    search: jobsSearch.trim() || undefined,
    queue: queueName,
    state: stateFilter === "all" ? undefined : stateFilter,
    enabled: !!queueName,
  });

  const jobsTotalPages = jobsData?.meta?.totalCount
    ? Math.ceil(jobsData.meta.totalCount / jobsLimit)
    : 0;

  return (
    <div>
      <JobsSearchBar
        searchQuery={jobsSearch}
        onSearchChange={onJobsSearchChange}
        totalJobs={jobsData?.meta?.totalCount || 0}
        lastRunningCompletedBy={jobsData?.meta?.lastRunningCompletedBy || null}
      />

      {jobsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">{t("common.loading")}</div>
        </div>
      )}

      {jobsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-red-800">
            {t("common.errorLoading")}{" "}
            {jobsError instanceof Error
              ? jobsError.message
              : t("common.unknownError")}
          </div>
        </div>
      )}

      {jobsData && jobsData.data && (
        <>
          <JobsTable
            jobs={jobsData.data.jobs}
            sortColumn={jobsSort}
            sortDirection={jobsOrder}
            onSort={onJobsSort}
            filterableStates={jobsData.meta?.filterableStates || null}
            stateFilter={stateFilter}
            onStateFilterChange={onStateFilterChange}
          />
          <Pagination
            currentPage={jobsPage}
            totalPages={jobsTotalPages}
            onPageChange={onJobsPageChange}
            pageSize={jobsLimit}
            onPageSizeChange={onJobsPageSizeChange}
          />
        </>
      )}

      {!jobsLoading &&
        !jobsError &&
        jobsData?.data &&
        jobsData.data.jobs.length === 0 && (
          <div className="text-gray-500">{t("queues.noJobs")}</div>
        )}
    </div>
  );
}
