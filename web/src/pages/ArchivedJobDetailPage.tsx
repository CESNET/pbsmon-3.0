import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useArchivedJob } from "@/hooks/useArchivedJobs";
import { ProgressBar } from "@/components/common/ProgressBar";

const GB = 1024 * 1024 * 1024;

// Format Unix epoch seconds as DD.MM.YYYY HH:MM:SS
const formatTimestamp = (timestamp: number | null | undefined): string => {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};

// Format seconds as HH:MM:SS
const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
};

// Format bytes as GB
const formatMemory = (bytes: number | null | undefined, unit: string): string =>
  bytes === null || bytes === undefined
    ? "-"
    : `${(bytes / GB).toFixed(2)} ${unit}`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm text-gray-900 break-all">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 last:border-b-0">
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export function ArchivedJobDetailPage() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading, error } = useArchivedJob(jobId || "");

  // Set browser tab title to job
  useEffect(() => {
    if (jobId) {
      document.title = jobId;
    }

    return () => {
      document.title = "MetaCentrum";
    };
  }, [jobId]);

  const header = (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
          {t("pages.archivedJobDetail")}
        </h1>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <>
        {header}
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("common.loading")}</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <div className="p-4 sm:p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              {t("common.errorLoading")}{" "}
              {error instanceof Error
                ? error.message
                : t("common.unknownError")}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        {header}
        <div className="p-4 sm:p-6">
          <div className="text-center text-gray-500 py-12">
            {t("jobsArchive.detail.notFound")}
          </div>
        </div>
      </>
    );
  }

  // cpupercent/gpupercent are totals over all CPUs/GPUs, show per-unit average
  const cpuUsagePerCpu =
    job.cpupercent != null && job.cpus
      ? Math.round(job.cpupercent / job.cpus)
      : null;
  const gpuUsagePerGpu =
    job.gpupercent != null && job.gpuReserved
      ? Math.round(job.gpupercent / job.gpuReserved)
      : null;
  const memoryUsagePercent =
    job.memoryUsed != null && job.memoryReserved
      ? Math.min(100, Math.round((job.memoryUsed / job.memoryReserved) * 100))
      : null;
  const exitFailed = typeof job.exitStatus === "number" && job.exitStatus !== 0;

  return (
    <>
      {header}
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("jobs.basicInfo")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("jobs.jobId")}</div>
                <div className="text-lg font-medium text-gray-900 font-mono break-all">
                  {job.id}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("jobs.jobName")}</div>
                <div className="text-lg font-medium text-gray-900 break-all">
                  {job.name || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("jobs.stateLabel")}</div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {t("jobs.state.archived")}
                  </span>
                </div>
              </div>
              <Field label={t("jobs.exitCode")}>
                <span className={exitFailed ? "text-red-600 font-medium" : ""}>
                  {job.exitStatus ?? "-"}
                </span>
              </Field>
              <Field label={t("jobs.owner")}>
                {job.username ? (
                  <Link
                    to={`/users/${encodeURIComponent(job.username)}`}
                    className="hover:text-primary-600 underline"
                  >
                    {job.username}
                  </Link>
                ) : (
                  "-"
                )}
              </Field>
              <Field label={t("jobs.queue")}>
                {job.queue ? (
                  <Link
                    to={`/queues/${encodeURIComponent(job.queue)}`}
                    className="hover:text-primary-600 underline"
                  >
                    {job.queue}
                  </Link>
                ) : (
                  "-"
                )}
              </Field>
              <Field label={t("jobsArchive.detail.pbsServer")}>
                {job.pbsServer || "-"}
              </Field>
            </div>
          </div>

          <Section title={t("jobs.timestamps")}>
            <Field label={t("jobs.createdAt")}>
              {formatTimestamp(job.createdAt)}
            </Field>
            <Field label={t("jobs.startedAt")}>
              {formatTimestamp(job.startedAt)}
            </Field>
            <Field label={t("jobsArchive.detail.endedAt")}>
              {formatTimestamp(job.endedAt)}
            </Field>
            <Field label={t("jobsArchive.detail.recordTime")}>
              {formatTimestamp(job.recordTime)}
            </Field>
          </Section>

          <div className="px-4 sm:px-6 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("jobs.resources")}
            </h2>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {t("jobs.requestedResources")}
            </h3>
            <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
              {job.requestedResources || t("jobs.noResourcesRequested")}
            </div>
          </div>

          <Section>
            <Field label={t("jobs.walltime")}>{formatDuration(job.walltime)}</Field>
            <Field label={t("jobs.runtime")}>{formatDuration(job.runtime)}</Field>
            <Field label={t("jobsArchive.detail.cpus")}>
              <span className="inline-flex items-center gap-1">
                {job.cpus}
                <Icon icon="solar:cpu-bold" className="w-[14px] h-[14px]" />
              </span>
            </Field>
            <Field label={t("jobsArchive.detail.cpuUsage")}>
              {cpuUsagePerCpu !== null ? (
                <ProgressBar
                  label="CPU:"
                  value={job.cpus}
                  percent={cpuUsagePerCpu}
                  color={(percent) => (percent < 50 ? "#ef4444" : "#4b5563")}
                  icon={<Icon icon="solar:cpu-bold" className="w-[14px] h-[14px]" />}
                />
              ) : (
                "-"
              )}
            </Field>
            <Field label={t("jobsArchive.detail.gpus")}>
              {job.gpuReserved ? (
                <span className="inline-flex items-center gap-1">
                  {job.gpuReserved}
                  <Icon icon="bi:gpu-card" className="w-[14px] h-[14px]" />
                </span>
              ) : (
                <span className="text-gray-400">{t("jobs.noGpu")}</span>
              )}
            </Field>
            <Field label={t("jobsArchive.detail.gpuUsage")}>
              {gpuUsagePerGpu !== null ? (
                <ProgressBar
                  label=""
                  value={job.gpuReserved ?? 0}
                  percent={gpuUsagePerGpu}
                  color="#4b5563"
                  icon={<Icon icon="bi:gpu-card" className="w-[14px] h-[14px]" />}
                />
              ) : (
                "-"
              )}
            </Field>
            <Field label={t("jobsArchive.detail.memoryReserved")}>
              {formatMemory(job.memoryReserved, t("jobs.gb"))}
            </Field>
            <Field label={t("jobsArchive.detail.memoryUsed")}>
              {memoryUsagePercent !== null ? (
                <ProgressBar
                  label="RAM"
                  value={formatMemory(job.memoryUsed, t("jobs.gb"))}
                  percent={memoryUsagePercent}
                  color="#4b5563"
                />
              ) : (
                formatMemory(job.memoryUsed, t("jobs.gb"))
              )}
            </Field>
          </Section>
        </div>
      </div>
    </>
  );
}
