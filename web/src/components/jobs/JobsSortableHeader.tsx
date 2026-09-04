import { Icon } from "@iconify/react";

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

interface JobsSortableHeaderProps {
  column: SortColumn;
  currentSortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  children: React.ReactNode;
}

export function JobsSortableHeader({
  column,
  currentSortColumn,
  sortDirection,
  onSort,
  children,
}: JobsSortableHeaderProps) {
  const isActive = currentSortColumn === column;

  return (
    <div
      className="flex items-center cursor-pointer hover:text-primary-600 select-none"
      onClick={() => onSort(column)}
    >
      {children}
      {!isActive ? (
        <Icon
          icon="icon-park-outline:sort"
          className="w-4 h-4 ml-1 text-gray-400"
        />
      ) : sortDirection === "asc" ? (
        <Icon
          icon="prime:sort-up-fill"
          className="w-4 h-4 ml-1 text-primary-600"
        />
      ) : (
        <Icon
          icon="prime:sort-down-fill"
          className="w-4 h-4 ml-1 text-primary-600"
        />
      )}
    </div>
  );
}
