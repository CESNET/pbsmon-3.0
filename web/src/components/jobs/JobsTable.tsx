import { useTranslation } from "react-i18next";
import type { JobListDTO } from "@/lib/generated-api";
import { JobsTableHeader } from "./JobsTableHeader";
import { JobsTableRow } from "./JobsTableRow";
import type { JobFilterableState } from "./JobsFilterableHeader";

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

interface JobsTableProps {
  jobs: JobListDTO[];
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  hideMachineColumn?: boolean;
  hideUserColumn?: boolean;
  filterableStates?: Record<string, string> | null;
  stateFilter?: JobFilterableState;
  onStateFilterChange?: (state: JobFilterableState) => void;
}

export function JobsTable({
  jobs,
  sortColumn,
  sortDirection,
  onSort,
  hideMachineColumn = false,
  hideUserColumn = false,
  filterableStates,
  stateFilter,
  onStateFilterChange,
}: JobsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
      {/* min-w-full (not min-w-max) keeps the grid bounded by the window so the
          Name column's 1fr track grows only into spare width; when the fixed
          minimums don't fit, overflow-x-auto on the parent provides scrolling. */}
      <div className="min-w-full">
        <JobsTableHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          hideMachineColumn={hideMachineColumn}
          hideUserColumn={hideUserColumn}
          filterableStates={filterableStates}
          stateFilter={stateFilter}
          onStateFilterChange={onStateFilterChange}
        />

        {/* Table Body */}
        <div>
          {jobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {t("jobs.noJobsFound")}
            </div>
          ) : (
            jobs.map((job) => (
              <JobsTableRow
                key={job.id}
                job={job}
                hideMachineColumn={hideMachineColumn}
                hideUserColumn={hideUserColumn}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
