import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { WaitingJobsSortableHeader } from "./WaitingJobsSortableHeader";

type SortColumn =
  | "id"
  | "name"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

interface WaitingJobsTableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
}

export function WaitingJobsTableHeader({
  sortColumn,
  sortDirection,
  onSort,
}: WaitingJobsTableHeaderProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  // Grid: ID (bigger), Name (smaller), User, Machine, CPU, GPU, RAM, Comment (flex-1), Created
  // Using fixed widths for all except Comment which uses flex-1.
  // In compact view only ID, the waiting reason (most important) and Created stay visible.
  const mobileGridCols = "grid-cols-[0.9fr_1.5fr_88px]";
  const desktopGridCols =
    "grid-cols-[180px_150px_100px_90px_90px_90px_minmax(160px,1fr)_90px]";
  const gridCols = isCompact ? mobileGridCols : desktopGridCols;

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div
        className={`grid ${gridCols} gap-2 text-sm font-medium text-gray-700 overflow-hidden`}
      >
        <WaitingJobsSortableHeader
          column="id"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.id")}
        </WaitingJobsSortableHeader>

        {!isCompact && (
          <div>
            <WaitingJobsSortableHeader
              column="name"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.name")}
            </WaitingJobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <WaitingJobsSortableHeader
              column="owner"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.username")}
            </WaitingJobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <WaitingJobsSortableHeader
              column="cpuReserved"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.cpuReserved")}
            </WaitingJobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <WaitingJobsSortableHeader
              column="gpuReserved"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.gpuReserved")}
            </WaitingJobsSortableHeader>
          </div>
        )}

        {!isCompact && (
          <div>
            <WaitingJobsSortableHeader
              column="memoryReserved"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("jobs.ram")}
            </WaitingJobsSortableHeader>
          </div>
        )}

        <div>{t("jobs.waitingReason")}</div>

        <div className="flex justify-end">
          <WaitingJobsSortableHeader
            column="createdAt"
            currentSortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          >
            {t("jobs.created")}
          </WaitingJobsSortableHeader>
        </div>
      </div>
    </div>
  );
}
