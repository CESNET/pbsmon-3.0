import { useTranslation } from "react-i18next";
import { JobsTable } from "@/components/jobs/JobsTable";
import { Pagination } from "@/components/common/Pagination";
import { JobsSearchBar } from "@/components/jobs/JobsSearchBar";
import type { JobsListDTO, JobsListMetaDto } from "@/lib/generated-api";
import type { JobFilterableState } from "@/components/jobs/JobsFilterableHeader";

type SortColumn =
  | "id"
  | "name"
  | "state"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

interface UserJobsTabProps {
  jobsData?: {
    data: JobsListDTO;
    meta?: JobsListMetaDto;
  };
  isLoading: boolean;
  error: Error | null;
  jobsPage: number;
  jobsLimit: number;
  jobsSort: SortColumn;
  jobsOrder: "asc" | "desc";
  jobsSearch: string;
  stateFilter: JobFilterableState;
  onSort: (column: SortColumn) => void;
  onPageChange: (page: number) => void;
  onSearchChange: (query: string) => void;
  onStateFilterChange: (state: JobFilterableState) => void;
}

export function UserJobsTab({
  jobsData,
  isLoading,
  error,
  jobsPage,
  jobsLimit,
  jobsSort,
  jobsOrder,
  jobsSearch,
  stateFilter,
  onSort,
  onPageChange,
  onSearchChange,
  onStateFilterChange,
}: UserJobsTabProps) {
  const { t } = useTranslation();

  const jobsTotalPages = jobsData?.meta?.totalCount
    ? Math.ceil(jobsData.meta.totalCount / jobsLimit)
    : 0;

  return (
    <div>
      <JobsSearchBar
        searchQuery={jobsSearch}
        onSearchChange={onSearchChange}
        totalJobs={jobsData?.meta?.totalCount || 0}
        lastRunningCompletedBy={jobsData?.meta?.lastRunningCompletedBy || null}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">{t("common.loading")}</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-red-800">
            {t("common.errorLoading")}{" "}
            {error instanceof Error ? error.message : t("common.unknownError")}
          </div>
        </div>
      )}

      {jobsData && jobsData.data && (
        <>
          <JobsTable
            jobs={jobsData.data.jobs}
            sortColumn={jobsSort}
            sortDirection={jobsOrder}
            onSort={onSort}
            filterableStates={jobsData.meta?.filterableStates || null}
            stateFilter={stateFilter}
            onStateFilterChange={onStateFilterChange}
          />
          <Pagination
            currentPage={jobsPage}
            totalPages={jobsTotalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
