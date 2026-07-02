import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface JobsSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalJobs: number;
  lastRunningCompletedBy: number | null;
}

const formatTimestamp = (
  timestamp: number | null
): string => {
  if (!timestamp || typeof timestamp !== "number") return "-";
  const date = new Date(timestamp * 1000);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};

export function JobsSearchBar({
  searchQuery,
  onSearchChange,
  totalJobs,
  lastRunningCompletedBy,
}: JobsSearchBarProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 639px)");

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
      <div className="relative w-full sm:max-w-md sm:flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon icon="mdi:magnify" className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            isMobile
              ? t("jobs.searchPlaceholderShort")
              : t("jobs.searchPlaceholder")
          }
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <Icon
              icon="mdi:close"
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
            />
          </button>
        )}
      </div>
      <div className="text-sm text-gray-600 whitespace-normal sm:whitespace-nowrap">
        {lastRunningCompletedBy
          ? t("jobs.totalJobsCompletedBy", {
              count: totalJobs,
              completedBy: formatTimestamp(lastRunningCompletedBy),
            })
          : t("jobs.totalJobs", { count: totalJobs })}
      </div>
    </div>
  );
}
