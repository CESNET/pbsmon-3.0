import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import type { JobDetailDTO } from "@/lib/generated-api";
import { ProgressBar } from "@/components/common/ProgressBar";

interface JobResourcesSectionProps {
  job: JobDetailDTO;
}

export function JobResourcesSection({ job }: JobResourcesSectionProps) {
  const { t } = useTranslation();

  // Show usage for running, exiting, and all completed states (C, F, X)
  const completedStates = ["C", "F", "X"];
  const showUsage =
    job.state === "R" ||
    job.state === "E" ||
    completedStates.includes(job.state);

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

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("jobs.resources")}
      </h2>

      {/* Requested Resources */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t("jobs.requestedResources")}
        </h3>
        <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
          {job.requestedResources || t("jobs.noResourcesRequested")}
        </div>
      </div>

      {/* Resource Reservation */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t("jobs.resourceReservation")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">{t("jobs.cpu")}</div>
            <div className="text-lg font-medium text-gray-900">
              {job.cpuReserved}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">{t("jobs.gpu")}</div>
            {job.gpuReserved === 0 ? (
              <div className="text-lg font-medium text-gray-400">
                {t("jobs.noGpu")}
              </div>
            ) : (
              <div className="text-lg font-medium text-gray-900">
                {job.gpuReserved}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">{t("jobs.memory")}</div>
            <div className="text-lg font-medium text-gray-900">
              {job.memoryReserved.toFixed(2)} GB
            </div>
          </div>
          {job.scratchReserved && (
            <div>
              <div className="text-sm text-gray-500">{t("jobs.scratch")}</div>
              <div className="text-lg font-medium text-gray-900">
                {job.scratchReserved.toFixed(2)} GB
              </div>
            </div>
          )}
          {job.walltimeReserved && (
            <div>
              <div className="text-sm text-gray-500">{t("jobs.walltime")}</div>
              <div className="text-lg font-medium text-gray-900">
                {formatTimeFromSeconds(
                  typeof job.walltimeReserved === "number"
                    ? job.walltimeReserved
                    : Number(job.walltimeReserved) || 0
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource Usage (only when running or finished) */}
      {showUsage && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {t("jobs.resourceUsage")}
          </h3>
          <div className="space-y-4">
            {job.runtime && typeof job.runtime == "string" && (
              <div>
                {typeof job.walltimeReserved === "number" &&
                (typeof job.startedAt == "number" || typeof job.startedAt == "bigint") &&
                (typeof job.completedBy == "number" || typeof job.completedBy == "bigint") &&
                job.walltimeReserved !== null ? (
                  <ProgressBar
                    label={t("jobs.walltime")}
                    value={formatSecondsToTime(job.walltimeReserved)}
                    percent={(parseTimeToSeconds(job.runtime)/(job.completedBy - job.startedAt) * 100)}
                    color="#4b5563"
                  />
                ) : (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {t("jobs.walltime")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {job.cpuTimeUsed && (
              <div>
                {typeof job.cpuUsagePercentPerCpu === "number" &&
                job.cpuUsagePercentPerCpu !== null ? (
                  <ProgressBar
                    label={t("jobs.cpuTimeUsed")}
                    value={String(job.cpuTimeUsed)}
                    percent={job.cpuUsagePercentPerCpu}
                    color="#4b5563"
                  />
                ) : (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {t("jobs.cpuTimeUsed")}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {String(job.cpuTimeUsed)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {job.gpuReserved > 0 && (
              <div>
                {typeof job.gpuUsagePercent === "number" &&
                job.gpuUsagePercent !== null &&
                typeof job.gpuUsagePercentPerGpu === "number" &&
                job.gpuUsagePercentPerGpu !== null? (
                  (() => {
                    // Calculate GPU time from GPU percent
                    const calculatedGpuTime = calculateGpuTimeFromPercent(
                      job.gpuUsagePercent,
                      job.runtime ? String(job.runtime) : null,
                      job.gpuReserved
                    );
                    return (
                      <ProgressBar
                        label={t("jobs.gpu")}
                        value={
                          calculatedGpuTime
                            ? calculatedGpuTime
                            : `${job.gpuReserved} ${t("jobs.gpu")}`
                        }
                        percent={job.gpuUsagePercentPerGpu}
                        color="#4b5563"
                        icon={
                          <Icon
                            icon="bi:gpu-card"
                            className="w-[14px] h-[14px]"
                          />
                        }
                      />
                    );
                  })()
                ) : job.gpuTimeUsed ? (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {t("jobs.gpuTimeUsed")}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {String(job.gpuTimeUsed)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {job.memoryUsed !== null && (
              <div>
                {typeof job.memoryUsagePercent === "number" &&
                job.memoryUsagePercent !== null ? (
                  <ProgressBar
                    label={t("jobs.memoryUsed")}
                    value={`${Number(job.memoryUsed).toFixed(2)} GB / ${Number(job.memoryReserved).toFixed(2)} GB`}
                    percent={job.memoryUsagePercent}
                    color="#4b5563"
                  />
                ) : (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {t("jobs.memoryUsed")}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {Number(job.memoryUsed).toFixed(2)} GB /{" "}
                        {Number(job.memoryReserved).toFixed(2)} GB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {job.runtime && (
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("jobs.runtime")}</span>
                  <span className="text-gray-900 font-medium">
                    {String(job.runtime)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allocated Resources */}
      {job.allocatedResources.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {t("jobs.allocatedResources")}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("jobs.machine")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("jobs.cpu")}
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("jobs.gpu")}
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("jobs.ram")}
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("jobs.scratch")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {job.allocatedResources.map((resource, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link
                        to={`/machines/${resource.machine}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {resource.machine}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {resource.cpu}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {resource.gpu === 0 ? (
                        <span className="text-gray-400">{t("jobs.noGpu")}</span>
                      ) : (
                        resource.gpu
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {resource.ram.toFixed(2)} GB
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {resource.scratch
                        ? `${resource.scratch.toFixed(2)} GB (${resource.scratchType || "local"})`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
