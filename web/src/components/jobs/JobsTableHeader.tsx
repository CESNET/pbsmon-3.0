import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  // Calculate grid columns based on which columns are hidden.
  // In compact view only Status/ID/Created stay visible, so the compact
  // template always has 3 tracks regardless of the props.
  const mobileGridCols = "grid-cols-[72px_1fr_88px]";
  let desktopGridCols: string;
  if (hideMachineColumn && hideUserColumn) {
    desktopGridCols = "grid-cols-[100px_280px_280px_1fr_1fr_1fr_120px]";
  } else if (hideMachineColumn) {
    desktopGridCols = "grid-cols-[100px_280px_280px_120px_1fr_1fr_1fr_120px]";
  } else if (hideUserColumn) {
    desktopGridCols = "grid-cols-[100px_280px_280px_140px_1fr_1fr_1fr_120px]";
  } else {
    desktopGridCols = "grid-cols-[100px_280px_280px_120px_140px_1fr_1fr_1fr_120px]";
  }
  const gridCols = isCompact ? mobileGridCols : desktopGridCols;

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div
        className={`grid ${gridCols} gap-2 text-sm font-medium text-gray-700 overflow-hidden`}
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

        {!isCompact && (
          <div>
            <JobsSortableHeader
              column="name"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.name")}
            </JobsSortableHeader>
          </div>
        )}

        {!isCompact && !hideUserColumn && (
          <div>
            <JobsSortableHeader
              column="owner"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.username")}
            </JobsSortableHeader>
          </div>
        )}

        {!isCompact && !hideMachineColumn && (
          <div>
            <JobsSortableHeader
              column="node"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.machine")}
            </JobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <JobsSortableHeader
              column="cpuReserved"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.cpuReserved")}
            </JobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <JobsSortableHeader
              column="gpuReserved"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.gpuReserved")}
            </JobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <JobsSortableHeader
              column="memoryReserved"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.ram")}
            </JobsSortableHeader>
          </div>
        )}

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
