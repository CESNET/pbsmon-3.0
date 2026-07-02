import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SortableHeader } from "./SortableHeader";
import type { SortColumn } from "./types";

interface UsersTableHeaderProps {
  fairshareServers: string[];
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  isAdmin: boolean;
}

export function UsersTableHeader({
  fairshareServers,
  sortColumn,
  sortDirection,
  onSort,
  isAdmin,
}: UsersTableHeaderProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  return (
    <div className={`px-4 py-3 border-b border-gray-200 bg-gray-50 ${isCompact ? "min-w-full" : "min-w-max"}`}>
      {/* Two-row header structure */}
      <div className="space-y-2">
        {/* First row - main column headers */}
        <div className={`flex gap-2 text-sm font-medium text-gray-700 ${isCompact ? "flex-wrap" : "flex-nowrap gap-4"}`}>
          <div className="w-40">
            <SortableHeader
              column="username"
              currentSortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {t("users.username")}
            </SortableHeader>
          </div>
          {!isCompact && (
            <div className="w-48">
              <SortableHeader
                column="nickname"
                currentSortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              >
                {t("users.nickname")}
              </SortableHeader>
            </div>
          )}
          {/* Fairshare label - spans all server columns */}
          {fairshareServers.length > 0 && (
            <div className="flex items-center gap-1">
              <span>{t("queues.fairshare")}</span>
              <div className="relative group">
                <Icon
                  icon="mdi:information"
                  className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-normal w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t("fairshare.infoTooltip")}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          )}
          {!isCompact && (
            <div className="pl-4 w-60">
              <div className="flex items-center gap-2 flex-wrap">
                <SortableHeader
                  column="totalTasks"
                  currentSortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={onSort}
                >
                  <span className="text-gray-500">{t("users.totalTasks")}</span>
                </SortableHeader>
              </div>
            </div>
          )}
          {!isCompact && (
            <div className="pl-4 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SortableHeader
                  column="totalCPU"
                  currentSortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={onSort}
                >
                  <span className="text-sm font-medium text-gray-700">
                    {t("users.resourceUsage")}
                  </span>
                </SortableHeader>
              </div>
            </div>
          )}
          {!isCompact && isAdmin && <div className="w-32">{t("users.actions")}</div>}
        </div>
        {/* Second row - server column headers */}
        {fairshareServers.length > 0 && (
          <div className={`flex gap-2 text-sm font-medium text-gray-700 ${isCompact ? "flex-wrap" : "flex-nowrap gap-4"}`}>
            {!isCompact && <div className="w-40"></div>}
            {!isCompact && <div className="w-48"></div>}
            <div className="flex flex-wrap gap-2">
              {fairshareServers.map((server) => (
                <div key={server} className="w-30">
                  <SortableHeader
                    column={`fairshare-${server}` as SortColumn}
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={onSort}
                  >
                    {server}
                  </SortableHeader>
                </div>
              ))}
            </div>
            {!isCompact && <div className="w-80"></div>}
            {!isCompact && <div className="w-80"></div>}
            {!isCompact && isAdmin && <div className="w-32"></div>}
          </div>
        )}
      </div>
    </div>
  );
}
