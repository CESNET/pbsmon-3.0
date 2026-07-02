import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { UserListDTO } from "@/lib/generated-api";

interface UsersTableRowProps {
  user: UserListDTO;
  fairshareServers: string[];
  maxFairshare: Record<string, number>;
  isAdmin: boolean;
  onImpersonate: (username: string) => void;
}

export function UsersTableRow({
  user,
  fairshareServers,
  maxFairshare,
  isAdmin,
  onImpersonate,
}: UsersTableRowProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  const handleImpersonate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onImpersonate(user.username);
  };

  // Helper function to get ranking icon based on ranking value
  // Higher ranking = better (opposite ranking: higher numbers are better)
  const getRankingIcon = (ranking: number, maxRanking: number) => {
    const percentage = (ranking / maxRanking) * 100;
    if (percentage >= 80) {
      return (
        <Icon icon="mdi:check-circle" className="w-4 h-4 text-green-600" />
      );
    } else if (percentage >= 50) {
      return <Icon icon="mdi:alert" className="w-4 h-4 text-yellow-600" />;
    } else {
      return <Icon icon="mdi:alert-circle" className="w-4 h-4 text-red-600" />;
    }
  };

  // Render resource usage with appropriate messages
  const renderResourceUsage = () => {
    const totalCPU = user.totalCPU || 0;
    const totalGPU = user.totalGPU || 0;

    // No resources at all
    if (totalCPU === 0 && totalGPU === 0) {
      return (
        <span className="text-gray-400 italic">{t("users.noResources")}</span>
      );
    }

    return (
      <div className="space-y-1">
        {/* CPU */}
        {totalCPU === 0 ? (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-gray-500 font-medium">CPU:</span>
            <span className="text-gray-400 italic">
              {t("users.noCpuResources")}
            </span>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-gray-500 font-medium">CPU:</span>
            <div className="flex gap-2 flex-wrap">
              <div>
                <span className="text-gray-500">{t("queues.queued")}</span>
                <span className="font-medium ml-1">{user.queuedCPU || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">{t("queues.running")}</span>
                <span className="font-medium text-blue-600 ml-1">
                  {user.runningCPU || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t("queues.done")}</span>
                <span className="font-medium text-green-600 ml-1">
                  {user.doneCPU || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t("queues.total")}</span>
                <span className="font-medium ml-1">{user.totalCPU || 0}</span>
              </div>
            </div>
          </div>
        )}
        {/* GPU */}
        {totalGPU === 0 ? (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-gray-500 font-medium">GPU:</span>
            <span className="text-gray-400 italic">
              {t("users.noGpuResources")}
            </span>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-gray-500 font-medium">GPU:</span>
            <div className="flex gap-2 flex-wrap">
              <div>
                <span className="text-gray-500">{t("queues.queued")}</span>
                <span className="font-medium ml-1">{user.queuedGPU || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">{t("queues.running")}</span>
                <span className="font-medium text-blue-600 ml-1">
                  {user.runningGPU || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t("queues.done")}</span>
                <span className="font-medium text-green-600 ml-1">
                  {user.doneGPU || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t("queues.total")}</span>
                <span className="font-medium ml-1">{user.totalGPU || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex gap-2 items-center py-2 px-4 border-b border-gray-100 bg-white hover:bg-gray-50 ${
        isCompact ? "flex-wrap min-w-full" : "flex-nowrap gap-4 min-w-max"
      }`}
    >
      {/* Username Column */}
      <div className="w-40">
        <Link
          to={`/users/${user.username}`}
          className="font-medium text-gray-900 hover:text-primary-600"
        >
          {user.username}
        </Link>
      </div>

      {/* Nickname Column */}
      {!isCompact && (
        <div className="w-48 text-sm text-gray-600">
          {typeof user.nickname === "string"
            ? user.nickname
            : user.nickname
              ? String(user.nickname)
              : "-"}
        </div>
      )}

      {/* Fairshare Columns - one per server */}
      {fairshareServers.map((server) => {
        const ranking = user.fairshareRankings?.[server];
        const maxRanking = maxFairshare[server];
        return (
          <div key={server} className="w-20 text-sm text-gray-600">
            {ranking !== undefined && ranking !== null && maxRanking ? (
              <div className="flex items-center gap-1">
                {getRankingIcon(ranking, maxRanking)}
                <span className="font-medium">{ranking}</span>
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      })}

      {/* Tasks Column - Same format as queues */}
      {!isCompact && (
        <div className="pl-4 w-60 text-sm text-gray-600">
          {(() => {
            const totalTasks = user.totalTasks || 0;

            // No jobs at all
            if (totalTasks === 0) {
              return (
                <span className="text-gray-400 italic">{t("users.noJobs")}</span>
              );
            }

            return (
              <>
                <div className="flex gap-2 flex-wrap">
                  <div>
                    <span className="text-gray-500">{t("queues.queued")}</span>
                    <span className="font-medium ml-2">{user.queuedTasks}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t("queues.running")}</span>
                    <span className="font-medium text-blue-600 ml-2">
                      {user.runningTasks}
                    </span>
                  </div>{" "}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <div>
                    <span className="text-gray-500">{t("queues.done")}</span>
                    <span className="font-medium text-green-600 ml-2">
                      {user.doneTasks}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t("queues.total")}</span>
                    <span className="font-medium ml-2">{user.totalTasks}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Resource Usage Column - CPU and GPU */}
      {!isCompact && (
        <div className="pl-4 flex-1 text-sm text-gray-600">
          {renderResourceUsage()}
        </div>
      )}

      {/* Actions Column - Only for admins */}
      {!isCompact && isAdmin && (
        <div className="w-32">
          <button
            onClick={handleImpersonate}
            className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded border border-primary-300 hover:border-primary-400"
          >
            {t("users.impersonate")}
          </button>
        </div>
      )}
    </div>
  );
}
