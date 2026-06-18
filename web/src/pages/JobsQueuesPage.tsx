import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useQueues } from "@/hooks/useQueues";
import type { QueueListDTO } from "@/lib/generated-api";
import { QueueTreeNode } from "@/components/common/QueueTreeNode";

type SortColumn = "name" | "priority" | "totalJobs" | "fairshare";

type QueueType = "all" | "non-reservation" | "reservation";

function filterQueueType(queues: QueueListDTO[], qType: QueueType): QueueListDTO[] {
  if (qType == "non-reservation")
    return queues.filter((q) => !q.hasReservation);
  if (qType == "reservation")
    return queues.filter((q) => q.hasReservation);
  return queues;
}

function filterEnabledAndStartedQueues(queues: QueueListDTO[]): QueueListDTO[] {
  return queues
    .filter((queue) => queue.enabled && (queue.started || queue.hasReservation))
    .map((queue) => {
      const filteredQueue: QueueListDTO = { ...queue };
      if (queue.children && queue.children.length > 0) {
        filteredQueue.children = filterEnabledAndStartedQueues(queue.children);
      }
      return filteredQueue;
    });
}

function sortQueues(
  queues: QueueListDTO[],
  sortColumn: SortColumn,
  sortOrder: "asc" | "desc"
): QueueListDTO[] {
  const sorted = [...queues].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case "name":
        comparison = (a.name || "").localeCompare(b.name || "");
        break;
      case "priority": {
        const priorityA: number =
          typeof a.priority === "number" ? a.priority : 0;
        const priorityB: number =
          typeof b.priority === "number" ? b.priority : 0;
        comparison = priorityB - priorityA; // Higher priority first
        break;
      }
      case "totalJobs": {
        const jobsA: number = typeof a.totalJobs === "number" ? a.totalJobs : 0;
        const jobsB: number = typeof b.totalJobs === "number" ? b.totalJobs : 0;
        comparison = jobsB - jobsA; // More jobs first
        break;
      }
      case "fairshare":
        const fairshareA = a.fairshare || "";
        const fairshareB = b.fairshare || "";
        comparison = fairshareA.localeCompare(fairshareB);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Recursively sort children
  return sorted.map((queue) => {
    if (queue.children && queue.children.length > 0) {
      return {
        ...queue,
        children: sortQueues(queue.children, sortColumn, sortOrder),
      };
    }
    return queue;
  });
}

function QueuesSortableHeader({
  column,
  currentSortColumn,
  sortDirection,
  onSort,
  children,
}: {
  column: SortColumn;
  currentSortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  children: React.ReactNode;
}) {
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

export function JobsQueuesPage() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortColumn>("priority");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const { data, isLoading, error } = useQueues();

  const filteredQueues = useMemo(() => {
    if (!data) return [];
    const filtered = filterEnabledAndStartedQueues(
      filterQueueType(data.queues, "non-reservation")
    );
    return sortQueues(filtered, sort, order);
  }, [data, sort, order]);

  const filteredReservationQueues = useMemo(() => {
    if (!data) return [];
    const filtered = filterEnabledAndStartedQueues(
      filterQueueType(data.queues, "reservation")
    );
    return sortQueues(filtered, sort, order);
  }, [data, sort, order]);

  const handleSort = (column: SortColumn) => {
    if (sort === column) {
      // Toggle order if same column
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default order
      setSort(column);
      setOrder("desc");
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.queues")}
          </h1>
        </div>
      </header>
      <div className="p-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("queues.loading")}</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              {t("queues.errorLoading")}{" "}
              {error instanceof Error
                ? error.message
                : t("queues.unknownError")}
            </div>
          </div>
        )}

        {data && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Table Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700">
                <div className="col-span-3">
                  <QueuesSortableHeader
                    column="name"
                    currentSortColumn={sort}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    {t("queues.queueName")}
                  </QueuesSortableHeader>
                </div>
                <div className="col-span-1">
                  <QueuesSortableHeader
                    column="priority"
                    currentSortColumn={sort}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    {t("queues.priority")}
                  </QueuesSortableHeader>
                </div>
                <div className="col-span-2">{t("queues.timeLimits")}</div>
                <div className="col-span-5">
                  <QueuesSortableHeader
                    column="totalJobs"
                    currentSortColumn={sort}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    {t("queues.jobs")}
                  </QueuesSortableHeader>
                </div>
                <div className="col-span-1">
                  <QueuesSortableHeader
                    column="fairshare"
                    currentSortColumn={sort}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    {t("queues.fairshare")}
                  </QueuesSortableHeader>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div>
              {filteredQueues.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  {t("queues.noQueuesFound")}
                </div>
              ) : (
                filteredQueues.map((queue, index) => (
                  <QueueTreeNode
                    key={queue.name}
                    queue={queue}
                    level={0}
                    isLast={index === filteredQueues.length - 1}
                  />
                ))
              )}
            </div>

            {filteredReservationQueues.length === 0 ? null : (
              <hr className="border-gray-200 dark:border-gray-700" />
            )}
            <div>
              {filteredReservationQueues.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  {t("queues.noQueuesFound")}
                </div>
              ) : (
                filteredReservationQueues.map((queue, index) => (
                  <QueueTreeNode
                    key={queue.name}
                    queue={queue}
                    level={0}
                    isLast={index === filteredReservationQueues.length - 1}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
