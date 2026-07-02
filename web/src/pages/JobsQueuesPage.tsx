import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useQueues } from "@/hooks/useQueues";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { QueueListDTO } from "@/lib/generated-api";
import { QueueTreeNode } from "@/components/common/QueueTreeNode";

type SortColumn = "name" | "priority" | "totalJobs" | "fairshare" | "reservationName" | "reservationOwner" | "reservationStart" | "reservationEnd";

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
      case "name": {
        comparison = (a.name || "").localeCompare(b.name || "");
        break;
      }
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
      case "fairshare": {
        const fairshareA = a.fairshare || "";
        const fairshareB = b.fairshare || "";
        comparison = fairshareA.localeCompare(fairshareB);
        break;
      }
      case "reservationName": {
        comparison = (a.reservation?.name || "").localeCompare(b.reservation?.name || "");
        break;
      }
      case "reservationOwner": {
        comparison = (a.reservation?.owner || "").localeCompare(b.reservation?.owner || "");
        break;
      }
      case "reservationStart": {
        const startA: number = typeof a.reservation?.startTime === "number"
          ? a.reservation?.startTime : 0;
        const startB: number = typeof b.reservation?.startTime === "number"
          ? b.reservation?.startTime : 0;
        comparison = startA - startB;
        break;
      }
      case "reservationEnd": {
        const startA: number = typeof a.reservation?.endTime === "number"
          ? a.reservation?.endTime : 0;
        const startB: number = typeof b.reservation?.endTime === "number"
          ? b.reservation?.endTime : 0;
        comparison = startA - startB;
        break;
      }
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

function formatResvDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()} ${hh}:${min}`;
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
  const { data, isLoading, error } = useQueues({ qType: "non-reservation" });

  const [resSort, setResSort] = useState<SortColumn>("reservationStart");
  const [resOrder, setResOrder] = useState<"asc" | "desc">("asc");
  const { data: resData, isLoading: resIsLoading, error: resError } = useQueues({ qType: "reservation" });

  const filteredQueues = useMemo(() => {
    if (!data) return [];
    const filtered = filterEnabledAndStartedQueues(
      data.queues
    );
    return sortQueues(filtered, sort, order);
  }, [data, sort, order]);

  const filteredReservationQueues = useMemo(() => {
    if (!resData) return [];
    const filtered = filterEnabledAndStartedQueues(
      resData.queues
    );
    return sortQueues(filtered, resSort, resOrder);
  }, [resData, resSort, resOrder]);

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

  const handleResSort = (column: SortColumn) => {
    if (resSort === column) {
      // Toggle order if same column
      setResOrder(resOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default order
      setResSort(column);
      setResOrder("desc");
    }
  };

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
            {t("pages.queues")}
          </h1>
        </div>
      </header>
      <div className="p-4 sm:p-6">
        {(isLoading || resIsLoading) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("queues.loading")}</div>
          </div>
        )}

        {(error || resError) && (
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
              <div className={`grid ${isCompact ? "grid-cols-[1fr_60px]" : "grid-cols-12"} gap-2 text-sm font-medium text-gray-700`}>
                <div className={`col-span-1 ${isCompact ? "" : "col-span-3"}`}>
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
                {!isCompact && (
                  <div className="col-span-2">{t("queues.timeLimits")}</div>
                )}
                {!isCompact && (
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
                )}
                {!isCompact && (
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
                )}
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
          </div>
        )}
        {resData && filteredReservationQueues.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <Icon icon="mdi:calendar-clock" className="w-5 h-5 text-purple-600" />
              <h2 className="text-sm font-semibold text-gray-700">{t("queues.reservationsTitle")}</h2>
            </div>
            {/* Column headers */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-12"} gap-2 text-xs font-medium text-gray-500 tracking-wide`}>
                <div className={`col-span-1 ${isCompact ? "" : "col-span-3"}`}>
                  <QueuesSortableHeader
                    column="name"
                    currentSortColumn={resSort}
                    sortDirection={resOrder}
                    onSort={handleResSort}
                  >
                    {t("queues.queueName")}
                  </QueuesSortableHeader>
                </div>
                <div className={`col-span-1 ${isCompact ? "" : "col-span-2"}`}>
                  <QueuesSortableHeader
                    column="reservationName"
                    currentSortColumn={resSort}
                    sortDirection={resOrder}
                    onSort={handleResSort}
                  >
                    {t("queues.reservationName")}
                  </QueuesSortableHeader>
                </div>
                {!isCompact && (
                  <div className="col-span-1">
                    <QueuesSortableHeader
                      column="reservationOwner"
                      currentSortColumn={resSort}
                      sortDirection={resOrder}
                      onSort={handleResSort}
                    >
                      {t("queues.reservationOwner")}
                    </QueuesSortableHeader>
                  </div>
                )}
                {!isCompact && (
                  <div className="col-span-1">{t("queues.status")}</div>
                )}
                {!isCompact && (
                  <div className="col-span-2">
                    <QueuesSortableHeader
                      column="reservationStart"
                      currentSortColumn={resSort}
                      sortDirection={resOrder}
                      onSort={handleResSort}
                    >
                      {t("queues.reservationStart")}
                    </QueuesSortableHeader>
                  </div>
                )}
                {!isCompact && (
                  <div className="col-span-2">
                    <QueuesSortableHeader
                      column="reservationEnd"
                      currentSortColumn={resSort}
                      sortDirection={resOrder}
                      onSort={handleResSort}
                    >
                      {t("queues.reservationEnd")}
                    </QueuesSortableHeader>
                  </div>
                )}
                {!isCompact && (
                  <div className="col-span-1">{t("queues.reservationResources")}</div>
                )}
              </div>
            </div>
            {/* Rows */}
            <div>
              {filteredReservationQueues.map((queue) => {
                const resv = queue.reservation;
                const queueId = queue.server
                  ? `${queue.name}@${queue.server}.metacentrum.cz`
                  : queue.name;
                return (
                  <div
                    key={queue.name}
                    className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-12"} gap-2 items-start py-3 px-4 border-b border-gray-100 hover:bg-gray-50`}
                  >
                    {/* Queue Name */}
                    <div className={`col-span-1 ${isCompact ? "" : "col-span-3"} text-sm min-w-0`}>
                      <Link
                        to={`/queues/${queueId}`}
                        className="font-medium text-gray-900 hover:text-primary-600 break-all"
                      >
                        {queueId}
                      </Link>
                      {queue.totalJobs !== undefined && queue.totalJobs !== null && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {t("queues.total")} {String(queue.totalJobs)}
                        </div>
                      )}
                    </div>
                    {/* Reservation Name / Display Name */}
                    <div className={`col-span-1 ${isCompact ? "" : "col-span-2"} text-sm text-gray-600 min-w-0`}>
                      {resv ? (
                        <>
                          <div className="font-medium break-words">
                            {resv.displayName && typeof resv.displayName === "string" ? resv.displayName : "-"}
                          </div>
                        </>
                      ) : "-"}
                    </div>
                    {!isCompact && (
                      <>
                        {/* Owner */}
                        <div className="col-span-1 text-sm text-gray-600">
                          {resv?.owner && typeof resv.owner === "string" ? (
                            <Link
                              to={`/users/${encodeURIComponent((resv.owner as string).split("@")[0])}`}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              {(resv.owner as string).split("@")[0]}
                            </Link>
                          ) : "-"}
                        </div>
                        {/* State */}
                        <div className="col-span-1 text-sm">
                          {resv?.isStarted ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {t("machines.reservationStarted")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              {t("machines.reservationNotStarted")}
                            </span>
                          )}
                        </div>
                        {/* Start Time */}
                        <div className="col-span-2 text-sm text-gray-600">
                          {resv?.startTime && typeof resv.startTime === "number"
                            ? formatResvDate(resv.startTime)
                            : "-"}
                        </div>
                        {/* End Time */}
                        <div className="col-span-2 text-sm text-gray-600">
                          {resv?.endTime && typeof resv.endTime === "number"
                            ? formatResvDate(resv.endTime)
                            : "-"}
                        </div>
                        {/* Resources */}
                        <div className="col-span-1 text-xs text-gray-600 space-y-0.5">
                          {resv?.resourceNcpus != null && (
                            <div>{t("queues.cpus")}: {String(resv.resourceNcpus)}</div>
                          )}
                          {resv?.resourceNgpus != null && (
                            <div>{t("queues.gpus")}: {String(resv.resourceNgpus)}</div>
                          )}
                          {resv?.resourceNodect != null && (
                            <div>{t("queues.nodes")}: {String(resv.resourceNodect)}</div>
                          )}
                          {resv?.resourceMem != null && (
                            <div>{t("queues.memory")}: {String(resv.resourceMem)}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
