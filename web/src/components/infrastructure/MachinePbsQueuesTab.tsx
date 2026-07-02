import { useTranslation } from "react-i18next";
import { useQueues } from "@/hooks/useQueues";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { QueueListDTO } from "@/lib/generated-api";
import { QueueTreeNode } from "@/components/common/QueueTreeNode";

interface MachinePbsQueuesTabProps {
  nodeQueues: QueueListDTO[];
}

function filterQueuesByNode(
  queues: QueueListDTO[],
  nodeQueueNames: Set<string>
): QueueListDTO[] {
  const result: QueueListDTO[] = [];

  for (const queue of queues) {
    const isNodeQueue = nodeQueueNames.has(queue.name);
    const hasRelevantChildren =
      queue.children && queue.children.length > 0
        ? filterQueuesByNode(queue.children, nodeQueueNames).length > 0
        : false;

    if (isNodeQueue || hasRelevantChildren) {
      const filteredQueue: QueueListDTO = { ...queue };
      if (queue.children && queue.children.length > 0) {
        filteredQueue.children = filterQueuesByNode(
          queue.children,
          nodeQueueNames
        );
      }
      result.push(filteredQueue);
    }
  }

  return result;
}

export function MachinePbsQueuesTab({ nodeQueues }: MachinePbsQueuesTabProps) {
  const { t } = useTranslation();
  const { data: queuesData, isLoading, error } = useQueues();
  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  const nodeQueueNames = new Set(nodeQueues.map((q) => q.name).filter(Boolean));

  const filteredQueues = queuesData
    ? filterQueuesByNode(queuesData.queues, nodeQueueNames)
    : [];

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <div className="text-gray-500">{t("queues.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <div className="text-red-600">
          {t("queues.errorLoading")}{" "}
          {error instanceof Error ? error.message : t("queues.unknownError")}
        </div>
      </div>
    );
  }

  if (filteredQueues.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <div className="text-gray-500">{t("machines.noQueues")}</div>
      </div>
    );
  }

  return (
    <div>
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
        {filteredQueues.map((queue, index) => (
          <QueueTreeNode
            key={queue.name}
            queue={queue}
            level={0}
            isLast={index === filteredQueues.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
