import { useTranslation } from "react-i18next";
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

  // Grid: ID (bigger), Name (smaller), User, Machine, CPU, GPU, RAM, Comment (flex-1), Created
  // Using fixed widths for all except Comment which uses flex-1
  const gridCols =
    "grid-cols-[300px_150px_120px_100px_100px_100px_1fr_180px]";

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div
        className={`grid ${gridCols} gap-2 text-sm font-medium text-gray-700`}
      >
        <WaitingJobsSortableHeader
          column="id"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.id")}
        </WaitingJobsSortableHeader>

        <WaitingJobsSortableHeader
          column="name"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.name")}
        </WaitingJobsSortableHeader>

        <WaitingJobsSortableHeader
          column="owner"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.username")}
        </WaitingJobsSortableHeader>

        <WaitingJobsSortableHeader
          column="cpuReserved"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.cpuReserved")}
        </WaitingJobsSortableHeader>

        <WaitingJobsSortableHeader
          column="gpuReserved"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.gpuReserved")}
        </WaitingJobsSortableHeader>

        <WaitingJobsSortableHeader
          column="memoryReserved"
          currentSortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        >
          {t("jobs.ram")}
        </WaitingJobsSortableHeader>

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
