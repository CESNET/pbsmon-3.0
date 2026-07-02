import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { QueueTreeNode } from "@/components/common/QueueTreeNode";
import type { QueueListDTO } from "@/lib/generated-api";

interface UserQueuesTabProps {
  queues: QueueListDTO[];
  isLoading: boolean;
  error: Error | null;
}

export function UserQueuesTab({
  queues,
  isLoading,
  error,
}: UserQueuesTabProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  return (
    <div>
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">{t("common.loading")}</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-red-800">
            {t("common.errorLoading")}{" "}
            {error instanceof Error ? error.message : t("common.unknownError")}
          </div>
        </div>
      )}

      {queues.length === 0 && !isLoading && !error && (
        <div className="text-gray-500 py-8 text-center">
          {t("queues.noQueuesFound")}
        </div>
      )}

      {queues.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className={`grid ${isCompact ? "grid-cols-[1fr_60px]" : "grid-cols-12"} gap-2 text-sm font-medium text-gray-700`}>
              <div className={`col-span-1 ${isCompact ? "" : "col-span-3"}`}>{t("queues.queueName")}</div>
              <div className="col-span-1">{t("queues.priority")}</div>
              {!isCompact && <div className="col-span-2">{t("queues.timeLimits")}</div>}
              {!isCompact && <div className="col-span-5">{t("queues.jobs")}</div>}
              {!isCompact && <div className="col-span-1">{t("queues.fairshare")}</div>}
            </div>
          </div>

          <div>
            {queues.map((queue, index) => (
              <QueueTreeNode
                key={queue.name}
                queue={queue}
                level={0}
                isLast={index === queues.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
