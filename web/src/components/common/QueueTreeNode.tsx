import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Tooltip } from "react-tooltip";
import type { QueueListDTO } from "@/lib/generated-api";

interface QueueTreeNodeProps {
  queue: QueueListDTO;
  level: number;
  isLast: boolean;
}

export function QueueTreeNode({ queue, level, isLast }: QueueTreeNodeProps) {
  const { t } = useTranslation();
  const hasChildren = queue.children && queue.children.length > 0;

  const queueId = queue.server
    ? `${queue.name}@${queue.server}.metacentrum.cz`
    : queue.name;

  const indentWidth = level * 40;

  const queuedJobs = queue.stateCount?.queued ?? 0;
  const runningJobs = queue.stateCount?.running ?? 0;
  const heldJobs = queue.stateCount?.held ?? 0;
  const totalJobs = queue.totalJobs ?? 0;

  const bgColorClass =
    level === 0
      ? "bg-white hover:bg-gray-50"
      : level === 1
        ? "bg-blue-50 hover:bg-blue-100"
        : level === 2
          ? "bg-indigo-50 hover:bg-indigo-100"
          : "bg-purple-50 hover:bg-purple-100";

  return (
    <>
      <div
        className={`grid grid-cols-12 gap-2 items-center py-2 px-0 border-b border-gray-100 relative ${bgColorClass}`}
      >
        {level > 0 && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none"
              style={{ left: `${indentWidth - 20}px` }}
            >
              <div className={`w-px h-full`} style={{ marginLeft: "19px" }}>
                <div
                  className={`w-px bg-gray-400 ${isLast ? "h-1/2" : "h-full"}`}
                ></div>
              </div>
              <div className="h-px bg-gray-400" style={{ width: "20px" }} />
            </div>
          </>
        )}

        <div
          className="col-span-3 flex items-center gap-2 min-w-0"
          style={{ paddingLeft: `${indentWidth}px` }}
        >
          <div className="w-5 flex-shrink-0" />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Route icon next to name */}
            {queue.queueType === "Route" && (
              <div className="flex-shrink-0 text-blue-600">
                <Icon
                  icon="material-symbols:alt-route"
                  className="w-6 h-6"
                  data-tooltip-id={`route-${queue.name}-${queue.server}`}
                  data-tooltip-content={t("queues.routeQueue")}
                />
                <Tooltip id={`route-${queue.name}-${queue.server}`} />
              </div>
            )}
            {!queue.canBeDirectlySubmitted && (
              <div className="flex-shrink-0 text-red-600">
                <Icon
                  icon="mdi:do-not-enter-outline"
                  className="w-4 h-4"
                  data-tooltip-id={`no-direct-${queue.name}-${queue.server}`}
                  data-tooltip-content={t("queues.noDirectSubmission")}
                />
                <Tooltip
                  id={`no-direct-${queue.name}-${queue.server}`}
                  style={{ maxWidth: "300px", whiteSpace: "normal" }}
                />
              </div>
            )}
            {queue.hasReservation && (
              <div
                className={`flex-shrink-0 ${
                  queue.started ? "text-purple-600" : "text-orange-600"
                }`}
              >
                <Icon
                  icon={
                    queue.started
                      ? "mdi:calendar-clock"
                      : "mdi:calendar-clock-outline"
                  }
                  className="w-5 h-5"
                  data-tooltip-id={`reservation-${queue.name}-${queue.server}`}
                  data-tooltip-content={
                    queue.started
                      ? t("queues.queueReserved")
                      : t("queues.queueReservedNotStarted")
                  }
                />
                <Tooltip
                  id={`reservation-${queue.name}-${queue.server}`}
                  style={{ maxWidth: "300px", whiteSpace: "normal" }}
                />
              </div>
            )}
            <Link
              to={`/queues/${queueId}`}
              className="font-medium text-gray-900 cursor-pointer hover:text-primary-600 truncate"
            >
              {queue.server
                ? `${queue.name}@${queue.server}.metacentrum.cz`
                : queue.name}
            </Link>
            {(() => {
              const isReserved =
                (queue.aclGroups && queue.aclGroups.length > 0) ||
                (queue.aclUsers && queue.aclUsers.length > 0);

              if (!isReserved) {
                return null;
              }

              const tooltipId = `reserved-${queue.name}-${queue.server}`;
              let tooltipContent = "";

              if (queue.aclGroups && queue.aclGroups.length > 0) {
                tooltipContent =
                  queue.hasAccess === false
                    ? t("queues.noAccessGroups", {
                        groups: queue.aclGroups.join(", "),
                      })
                    : t("queues.restrictedGroups", {
                        groups: queue.aclGroups.join(", "),
                      });
              } else if (queue.aclUsers && queue.aclUsers.length > 0) {
                tooltipContent = t("queues.reservedForUsers", {
                  users: queue.aclUsers
                    .map((u) => {
                      // Show full info if username is available, otherwise just nickname
                      if (u.username) {
                        return u.name
                          ? `${u.name} (${u.username})`
                          : u.username;
                      } else {
                        return u.nickname || "Unknown";
                      }
                    })
                    .join(", "),
                });
              }

              return (
                <span
                  className={`flex items-center px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                    queue.hasAccess === false
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                  data-tooltip-id={tooltipId}
                  data-tooltip-content={tooltipContent}
                >
                  <Icon
                    icon={
                      queue.hasAccess === false
                        ? "bxs:lock-alt"
                        : "bxs:lock-open-alt"
                    }
                    className="w-4 h-4 mr-1"
                  />
                  <Tooltip
                    id={tooltipId}
                    style={{ maxWidth: "400px", whiteSpace: "normal" }}
                  />
                </span>
              );
            })()}
          </div>
        </div>

        {/* Priority Column */}
        <div className="col-span-1 text-sm text-gray-600">
          {queue.priority !== null && queue.priority !== undefined
            ? String(queue.priority)
            : "-"}
        </div>

        {/* Time Limits Column */}
        <div className="col-span-2 text-sm text-gray-600">
          {queue.minWalltime || queue.maxWalltime ? (
            <span>
              {queue.minWalltime && queue.maxWalltime
                ? `${queue.minWalltime} - ${queue.maxWalltime}`
                : queue.minWalltime
                  ? `${t("queues.min")}: ${queue.minWalltime}`
                  : `${t("queues.max")}: ${queue.maxWalltime}`}
            </span>
          ) : (
            "-"
          )}
        </div>

        {/* Jobs Breakdown Column */}
        <div className="col-span-5 text-sm text-gray-600 pe-12">
          <div className="flex gap-2 flex-wrap lg:justify-between">
            <div>
              <span className="text-gray-500">{t("queues.queued")}</span>
              <span className="font-medium ml-2">{queuedJobs}</span>
            </div>
            <div>
              <span className="text-gray-500">{t("queues.running")}</span>
              <span className="font-medium text-blue-600 ml-2">
                {runningJobs}
              </span>
            </div>
            <div>
              <span className="text-gray-500">{t("queues.held")}</span>
              <span className="font-medium text-red-600 ml-2">
                {heldJobs}
              </span>
            </div>
            <div>
              <span className="text-gray-500">{t("queues.total")}</span>
              <span className="font-medium ml-2">{String(totalJobs)}</span>
            </div>
            <div>
              <span className="text-gray-500">{t("queues.maxForUser")}:</span>
              <span className="ml-2">
                {queue.maximumForUser !== null &&
                queue.maximumForUser !== undefined
                  ? String(queue.maximumForUser)
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Fairshare Column */}
        <div className="col-span-1 text-sm text-gray-600">
          {typeof queue.fairshare === "string"
            ? queue.fairshare
            : queue.fairshare
              ? String(queue.fairshare)
              : ""}
        </div>
      </div>

      {/* Children - Always expanded */}
      {hasChildren && (
        <>
          {queue.children!.map((child, index) => (
            <QueueTreeNode
              key={child.name}
              queue={child}
              level={level + 1}
              isLast={index === queue.children!.length - 1}
            />
          ))}
        </>
      )}
    </>
  );
}
