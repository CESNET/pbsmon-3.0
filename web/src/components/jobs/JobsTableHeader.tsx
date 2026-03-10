import { useTranslation } from "react-i18next";
import { JobsSortableHeader } from "./JobsSortableHeader";
import { JobsFilterableHeader, type JobFilterableState } from "./JobsFilterableHeader";

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

interface JobsTableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  hideMachineColumn?: boolean;
  hideUserColumn?: boolean;
  filterableStates?: Record<string, string> | null;
  stateFilter?: JobFilterableState;
  onStateFilterChange?: (state: JobFilterableState) => void;
}

export function JobsTableHeader({
  sortColumn,
  sortDirection,
  onSort,
  hideMachineColumn = false,
  hideUserColumn = false,
  filterableStates,
  stateFilter,
  onStateFilterChange,
}: JobsTableHeaderProps) {
  const { t } = useTranslation();

  // Calculate grid columns based on which columns are hidden
  let gridCols: string;
  if (hideMachineColumn && hideUserColumn) {
    gridCols = "grid-cols-[100px_300px_150px_1fr_1fr_1fr_160px]";
  } else if (hideMachineColumn) {
    gridCols = "grid-cols-[100px_300px_150px_120px_1fr_1fr_1fr_160px]";
  } else if (hideUserColumn) {
    gridCols = "grid-cols-[100px_300px_150px_150px_1fr_1fr_1fr_160px]";
  } else {
    gridCols = "grid-cols-[100px_300px_150px_120px_150px_1fr_1fr_1fr_160px]";
  }

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div
        className={`grid ${gridCols} gap-2 text-sm font-medium text-gray-700`}
      >
        <JobsFilterableHeader
          filterableStates={filterableStates}
          stateFilter={stateFilter}
          onStateFilterChange={onStateFilterChange}
        >
        </JobsFilterableHeader>

        <JobsSortableHeader
          column="id"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.id")}
        </JobsSortableHeader>

        <JobsSortableHeader
          column="name"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.name")}
        </JobsSortableHeader>

        {!hideUserColumn && (
          <JobsSortableHeader
            column="owner"
            currentSortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          >
            {t("jobs.username")}
          </JobsSortableHeader>
        )}

        {!hideMachineColumn && (
          <JobsSortableHeader
            column="node"
            currentSortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          >
            {t("jobs.machine")}
          </JobsSortableHeader>
        )}

        <JobsSortableHeader
          column="cpuReserved"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.cpuReserved")}
        </JobsSortableHeader>

        <JobsSortableHeader
          column="gpuReserved"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.gpuReserved")}
        </JobsSortableHeader>

        <JobsSortableHeader
          column="memoryReserved"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.ram")}
        </JobsSortableHeader>

        <div className="flex justify-end">
          <JobsSortableHeader
            column="createdAt"
            currentSortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          >
            {t("jobs.created")}
          </JobsSortableHeader>
        </div>
      </div>
    </div>
  );
}
