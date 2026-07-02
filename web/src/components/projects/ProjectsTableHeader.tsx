import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ProjectsSortableHeader } from "./ProjectsSortableHeader";
import type { SortColumn } from "./types";

interface ProjectsTableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
}

export function ProjectsTableHeader({
  sortColumn,
  sortDirection,
  onSort,
}: ProjectsTableHeaderProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  return (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <ProjectsSortableHeader
            column="status"
            currentSortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          >
            {t("projects.status")}
          </ProjectsSortableHeader>
        </th>
        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <ProjectsSortableHeader
            column="name"
            currentSortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          >
            {t("projects.name")}
          </ProjectsSortableHeader>
        </th>
        {!isCompact && (
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <ProjectsSortableHeader
              column="vmCount"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("projects.reservedResources")}
            </ProjectsSortableHeader>
          </th>
        )}
      </tr>
    </thead>
  );
}
