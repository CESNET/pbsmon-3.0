import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { JobsSummaryDTO } from "@/lib/generated-api";

interface WaitingJobsSummaryProps {
  summary: JobsSummaryDTO;
  onFilterByReason?: (reason: string) => void;
  activeFilter?: string | null;
}

interface ReasonCount {
  reason: string;
  count: number;
}

export function WaitingJobsSummary({
  summary,
  onFilterByReason,
  activeFilter,
}: WaitingJobsSummaryProps) {
  const { t } = useTranslation();

  // Group jobs by comment/reason and count them
  const reasonCounts = new Map<string, number>();

  if (summary.waitingReasons) {
    for (const reason of Object.keys(summary.waitingReasons)) {
      reasonCounts.set(reason, summary.waitingReasons[reason]);
    }
  }

  // Convert to array and sort by count (descending)
  const sortedReasons: ReasonCount[] = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  if (sortedReasons.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
      <h2 className="text-lg sm:text-xl font-bold text-primary-900 mb-4">
        {t("jobs.waitingJobsSummary")}
      </h2>
      <div className="space-y-2">
        {sortedReasons.map(({ reason, count }, index) => {
          const isActive = activeFilter === reason;
          return (
            <div
              key={index}
              className={`flex flex-wrap sm:flex-nowrap items-start gap-2 sm:gap-4 py-2 border-b border-gray-100 last:border-b-0 ${
                isActive ? "bg-primary-50" : ""
              }`}
            >
              <div className="font-semibold text-gray-900 min-w-[50px] sm:min-w-[80px] text-right">
                {count}x
              </div>
              <div className="text-gray-700 flex-1 min-w-0 break-words">
                {reason || <span className="text-gray-400 italic">-</span>}
              </div>
              {onFilterByReason && (
                <button
                  onClick={() => onFilterByReason(reason)}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                    isActive
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={
                    isActive ? t("jobs.clearFilter") : t("jobs.filterByReason")
                  }
                >
                  {isActive ? (
                    <>
                      <Icon icon="mdi:filter-remove" className="w-4 h-4" />
                      <span>{t("jobs.clear")}</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:filter" className="w-4 h-4" />
                      <span>{t("jobs.filter")}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
