import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { JobListDTO } from "@/lib/generated-api";

interface WaitingJobsTableRowProps {
  job: JobListDTO;
}

export function WaitingJobsTableRow({ job }: WaitingJobsTableRowProps) {
  const { t } = useTranslation();

  const username = job.username || job.owner?.split("@")[0];

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

  // Grid: ID (bigger), Name (smaller), User, Machine, CPU, GPU, RAM, Comment (flex-1), Created
  // Using fixed widths for all except Comment which uses flex-1
  const gridCols =
    "grid-cols-[300px_150px_120px_100px_100px_100px_1fr_180px]";

  return (
    <div
      className={`grid ${gridCols} gap-2 items-center py-3 px-4 border-b border-gray-100 bg-white hover:bg-gray-50 overflow-hidden`}
    >
      {/* ID Column */}
      <div className="text-left">
        <Link
          to={`/jobs/${encodeURIComponent(job.id)}`}
          className="text-sm text-gray-900 font-mono hover:text-primary-600 underline cursor-pointer"
        >
          <span>{job.id}</span>
        </Link>
      </div>

      {/* Name Column */}
      <div
        className="text-sm text-gray-900 truncate"
        title={String(job.name || "")}
      >
        {String(job.name || "")}
      </div>

      {/* Username Column - Show username if canSeeOwner, anonymized otherwise */}
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

      {/* CPU Column */}
      <div className="text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-900">
            {typeof job.cpuReserved === "number"
              ? job.cpuReserved
              : Number(job.cpuReserved) || 0}
          </span>
          <Icon icon="solar:cpu-bold" className="w-[14px] h-[14px]" />
        </div>
      </div>

      {/* GPU Column */}
      <div className="text-sm">
        {(() => {
          const gpuReserved =
            typeof job.gpuReserved === "number"
              ? job.gpuReserved
              : Number(job.gpuReserved) || 0;

          // Show "no GPU" in gray if gpuReserved is 0
          if (gpuReserved === 0) {
            return (
              <div className="text-gray-400 text-sm">{t("jobs.noGpu")}</div>
            );
          }

          // Show gpu count
          return (
            <div className="flex items-center gap-1">
              <span className="text-gray-900">{gpuReserved}</span>
              <Icon icon="bi:gpu-card" className="w-[14px] h-[14px]" />
            </div>
          );
        })()}
      </div>

      {/* RAM Column */}
      <div className="text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-900">
            {typeof job.memoryReserved === "number"
              ? job.memoryReserved
              : Number(job.memoryReserved) || 0}{" "}
            {t("jobs.gb")}
          </span>
          <Icon icon="ph:memory" className="w-[14px] h-[14px]" />
        </div>
      </div>

      {/* Comment Column - Most important, shows reason for waiting */}
      <div className="text-sm text-gray-900 truncate min-w-0">
        {job.comment ? (
          String(job.comment)
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>

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
