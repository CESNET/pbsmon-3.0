import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { JobListDTO } from "@/lib/generated-api";
import { ProgressBar } from "@/components/common/ProgressBar";

interface JobsTableRowProps {
  job: JobListDTO;
  hideMachineColumn?: boolean;
  hideUserColumn?: boolean;
}

export function JobsTableRow({
  job,
  hideMachineColumn = false,
  hideUserColumn = false,
}: JobsTableRowProps) {
  const { t } = useTranslation();

  const username = job.username || job.owner?.split("@")[0];

  // Get state label and color from backend
  const stateName = String((job as any).stateName || job.state || "");
  const stateColor = String(
    (job as any).stateColor || "bg-gray-100 text-gray-800"
  );
  const stateLabel = String(
    t(`jobs.state.${stateName}`, { default: stateName })
  );

  const stateInfo = {
    label: stateLabel,
    color: stateColor,
  };
  const jobState = String(job.state || "");

  // Check if this is a parent job (array job controller)
  // Parent jobs have IDs like "14699148[].pbs-m1.metacentrum.cz"
  const isParentJob = /\[\]/.test(job.id);
  const parentJobTooltipId = `parent-job-${job.id}`;

  // In compact view, show just the numeric job number to save space; full ID otherwise
  const shortJobId = job.id.match(/^\d+/)?.[0] || job.id;

  // Format date (DD.MM.YYYY)
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Format time (HH:MM)
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format time string (HH:MM:SS)
  const formatTimeString = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    return timeStr;
  };

  // Parse time string (HH:MM:SS) to seconds
  const parseTimeToSeconds = (timeStr: string | null | undefined): number => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(":").map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // Format seconds to HH:MM:SS
  const formatSecondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate GPU time from GPU percent
  // Note: gpuPercent represents the total percentage for all GPUs combined
  // With 2 GPUs, gpuPercent can be up to 200% (100% per GPU)
  // Formula: per-GPU percentage = gpuPercent / gpuReserved
  //         GPU time = (gpuPercent / gpuReserved) * runtime
  const calculateGpuTimeFromPercent = (
    gpuPercent: number,
    runtime: string | null | undefined,
    gpuReserved: number
  ): string | null => {
    if (!runtime || gpuReserved === 0) return null;
    const runtimeSeconds = parseTimeToSeconds(runtime);
    if (runtimeSeconds === 0) return null;
    // Calculate GPU time: (total percentage / number of GPUs) * runtime
    const perGpuPercent = gpuPercent / gpuReserved;
    const gpuTimeSeconds = (perGpuPercent / 100) * runtimeSeconds;
    return formatSecondsToTime(gpuTimeSeconds);
  };

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  // Calculate grid columns based on which columns are hidden.
  // In compact view only Status/ID/Created stay visible, so the compact
  // template always has 3 tracks regardless of the props.
  const mobileGridCols = "grid-cols-[72px_1fr_88px]";
  let desktopGridCols: string;
  if (hideMachineColumn && hideUserColumn) {
    desktopGridCols = "grid-cols-[100px_300px_150px_1fr_1fr_1fr_160px]";
  } else if (hideMachineColumn) {
    desktopGridCols = "grid-cols-[100px_300px_150px_120px_1fr_1fr_1fr_160px]";
  } else if (hideUserColumn) {
    desktopGridCols = "grid-cols-[100px_300px_150px_150px_1fr_1fr_1fr_160px]";
  } else {
    desktopGridCols = "grid-cols-[100px_300px_150px_120px_150px_1fr_1fr_1fr_160px]";
  }
  const gridCols = isCompact ? mobileGridCols : desktopGridCols;

  return (
    <div
      className={`grid ${gridCols} gap-2 items-center py-3 px-4 border-b border-gray-100 bg-white hover:bg-gray-50 overflow-hidden`}
    >
      {/* Status Column */}
      <div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateInfo.color}`}
        >
          {stateInfo.label}
        </span>
        {typeof job.exitCode === "number" && (
          <div className="text-xs text-gray-500 mt-1">
            {t("jobs.exit")}: {String(job.exitCode)}
          </div>
        )}
      </div>

      {/* ID Column */}
      <div className="text-left min-w-0">
        <div className="flex items-center gap-2">
          {job.canSeeOwner ? (
            <Link
              to={`/jobs/${encodeURIComponent(job.id)}`}
              className="text-sm text-gray-900 font-mono hover:text-primary-600 underline cursor-pointer"
              title={job.id}
            >
              {isCompact ? shortJobId : <span className="break-all">{job.id}</span>}
            </Link>
          ) : (
            <span title={job.id}>
              {isCompact ? shortJobId : <span className="break-all">{job.id}</span>}
            </span>
          )}
          {isParentJob && (
            <>
              <Icon
                icon="ph:tree-view-fill"
                className="w-4 h-4 text-primary-600 flex-shrink-0"
                data-tooltip-id={parentJobTooltipId}
                data-tooltip-content={t("jobs.parentJobTooltip")}
              />
              <Tooltip id={parentJobTooltipId} />
            </>
          )}
        </div>
        {/* Name shown here only in compact view; the dedicated Name column takes over otherwise */}
        {isCompact && (
          <div className="text-sm text-gray-900 truncate mt-0.5">
            {String(job.name || "")}
          </div>
        )}
        {(jobState === "R" ||
          jobState === "C" ||
          jobState === "F" ||
          jobState === "X") &&
          (job as any).runtime && (
            <div className="text-xs text-gray-600 mt-1">
              {t("jobs.runtime")}:{" "}
              {formatTimeString(String((job as any).runtime))}
            </div>
          )}
      </div>

      {/* Name Column */}
      {!isCompact && (
        <div
          className="text-sm text-gray-900 truncate"
          title={String(job.name || "")}
        >
          {String(job.name || "")}
        </div>
      )}

      {/* Username Column - Show username if canSeeOwner, anonymized otherwise */}
      {!isCompact && !hideUserColumn && (
        <div className="text-sm">
          {job.canSeeOwner && username ? (
            <Link
              to={`/users/${encodeURIComponent(username)}`}
              className="text-gray-900 hover:text-primary-600 underline cursor-pointer"
            >
              {String(username)}
            </Link>
          ) : (
            <span className="text-gray-900">{t("jobs.anonym")}</span>
          )}
        </div>
      )}

      {/* Machine Column */}
      {!isCompact && !hideMachineColumn && (
        <div className="text-sm">
          {job.node ? (
            <span>{String(job.node)}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )}

      {/* CPU Column */}
      {!isCompact && (
        <div className="text-sm">
          {(jobState === "R" ||
            jobState === "C" ||
            jobState === "F" ||
            jobState === "X") &&
          typeof job.cpuUsagePercentPerCpu === "number" &&
          job.cpuUsagePercentPerCpu !== null &&
          job.cpuUsagePercentPerCpu !== undefined ? (
            <div className="mb-1">
              <ProgressBar
                label={`CPU:`}
                value={
                  typeof job.cpuReserved === "number"
                    ? job.cpuReserved
                    : Number(job.cpuReserved) || 0
                }
                percent={job.cpuUsagePercentPerCpu}
                color={(percent) => (percent < 50 ? "#ef4444" : "#4b5563")}
                icon={
                  <Icon icon="solar:cpu-bold" className="w-[14px] h-[14px]" />
                }
              />
              {job.cpuTimeUsed && (
                <div className="text-gray-600 flex justify-between">
                  <span>{t("jobs.cpuTime")}:</span>
                  <span>{formatTimeString(String(job.cpuTimeUsed))}</span>
                </div>
              )}
            </div>
          ) : job.cpuTimeUsed ? (
            // Show CPU time even if CPU percent is not available (for completed jobs)
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-900">
                  {typeof job.cpuReserved === "number"
                    ? job.cpuReserved
                    : Number(job.cpuReserved) || 0}
                </span>
                <Icon icon="solar:cpu-bold" className="w-[14px] h-[14px]" />
              </div>
              <div className="text-gray-600 flex justify-between">
                <span>{t("jobs.cpuTime")}:</span>
                <span>{formatTimeString(String(job.cpuTimeUsed))}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-gray-900">
                {typeof job.cpuReserved === "number"
                  ? job.cpuReserved
                  : Number(job.cpuReserved) || 0}
              </span>
              <Icon icon="solar:cpu-bold" className="w-[14px] h-[14px]" />
            </div>
          )}
        </div>
      )}

      {/* GPU Column */}
      {!isCompact && (
        <div className="text-sm">
          {(() => {
            const gpuReserved =
              typeof job.gpuReserved === "number"
                ? job.gpuReserved
                : Number(job.gpuReserved) || 0;
            const gpuUsagePercent =
              typeof job.gpuUsagePercent === "number" &&
              job.gpuUsagePercent !== null &&
              job.gpuUsagePercent !== undefined
                ? job.gpuUsagePercent
                : null;

            // Show "no GPU" in gray if gpuReserved is 0
            if (gpuReserved === 0) {
              return (
                <div className="text-gray-400 text-sm">{t("jobs.noGpu")}</div>
              );
            }

            // Show progress bar if we have gpuUsagePercent and job is running or completed
            if (
              (jobState === "R" ||
                jobState === "C" ||
                jobState === "F" ||
                jobState === "X") &&
              gpuUsagePercent !== null
            ) {
              // Calculate GPU time from GPU percent
              const calculatedGpuTime = calculateGpuTimeFromPercent(
                gpuUsagePercent,
                (job as any).runtime,
                gpuReserved
              );

              return (
                <div className="mb-1">
                  { job.gpuUsagePercentPerGpu !== null && typeof job.gpuUsagePercentPerGpu === "number" && (
                  <ProgressBar
                    label=""
                    value={gpuReserved}
                    percent={job.gpuUsagePercentPerGpu}
                    color="#4b5563"
                    icon={
                      <Icon icon="bi:gpu-card" className="w-[14px] h-[14px]" />
                    }
                  />
                  )}
                  {calculatedGpuTime && (
                    <div className="text-gray-600 flex justify-between ">
                      <span>{t("jobs.gpuTime")}:</span>
                      <span>{calculatedGpuTime}</span>
                    </div>
                  )}
                </div>
              );
            }

            // Default: show gpu count
            return (
              <div className="flex items-center gap-1">
                <span className="text-gray-900">{gpuReserved}</span>
                <Icon icon="bi:gpu-card" className="w-[14px] h-[14px]" />
              </div>
            );
          })()}
        </div>
      )}

      {/* RAM Column */}
      {!isCompact && (
        <div className="text-sm">
          {(jobState === "R" ||
            jobState === "C" ||
            jobState === "F" ||
            jobState === "X") &&
          typeof job.memoryUsagePercent === "number" &&
          job.memoryUsagePercent !== null &&
          job.memoryUsagePercent !== undefined ? (
            <div className="mb-1">
              <ProgressBar
                label="RAM"
                value={`${
                  typeof job.memoryReserved === "number"
                    ? job.memoryReserved
                    : Number(job.memoryReserved) || 0
                } ${t("jobs.gb")}`}
                percent={job.memoryUsagePercent}
                color="#4b5563"
              />
              <div className="h-4"></div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-gray-900">
                {typeof job.memoryReserved === "number"
                  ? job.memoryReserved
                  : Number(job.memoryReserved) || 0}{" "}
                {t("jobs.gb")}
              </span>

              <Icon icon="ph:memory" className="w-[14px] h-[14px]" />
            </div>
          )}
        </div>
      )}

      {/* Created Column */}
      <div className="text-sm text-gray-600 text-right">
        {formatDate(
          typeof job.createdAt === "number"
            ? job.createdAt
            : Number(job.createdAt) || 0
        )}
        <br />
        {formatTime(
          typeof job.createdAt === "number"
            ? job.createdAt
            : Number(job.createdAt) || 0
        )}
      </div>
    </div>
  );
}
