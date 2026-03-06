import { useTranslation } from "react-i18next";
import type { JobListDTO } from "@/lib/generated-api";
import { JobsTableHeader } from "./JobsTableHeader";
import { JobsTableRow } from "./JobsTableRow";
import type { JobFilterableState } from "./JobsFilterableHeader";

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

interface JobsTableProps {
  jobs: JobListDTO[];
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  hideMachineColumn?: boolean;
  hideUserColumn?: boolean;
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
  stateFilter,
  onStateFilterChange,
}: JobsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
      <div className="min-w-max">
        <JobsTableHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          hideMachineColumn={hideMachineColumn}
          hideUserColumn={hideUserColumn}
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
