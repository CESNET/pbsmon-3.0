import { useTranslation } from "react-i18next";
import type { JobDetailDTO } from "@/lib/generated-api";
import { Icon } from "@iconify/react";

interface JobTimestampsSectionProps {
  job: JobDetailDTO;
}

export function JobTimestampsSection({ job }: JobTimestampsSectionProps) {
  const { t } = useTranslation();

  const formatTimestamp = (
    timestamp: number | null | undefined | Record<string, any>
  ): string => {
    if (!timestamp || typeof timestamp !== "number") return "-";
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("jobs.timestamps")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">{t("jobs.createdAt")}</div>
          <div className="text-sm text-gray-900">
            {formatTimestamp(job.createdAt)}
          </div>
        </div>
        {job.eligibleAt && (
          <div>
            <div className="text-sm text-gray-500">{t("jobs.eligibleAt")}</div>
            <div className="text-sm text-gray-900">
              {formatTimestamp(job.eligibleAt)}
            </div>
          </div>
        )}
        {job.startedAt && (
          <div>
            <div className="text-sm text-gray-500">{t("jobs.startedAt")}</div>
            <div className="text-sm text-gray-900">
              {formatTimestamp(job.startedAt)}
            </div>
          </div>
        )}
        {job.obitAt === null && job.completedBy && (
          <div>
            <div className="text-sm text-gray-500">{t("jobs.completedBy")}</div>
            <div className="text-sm text-gray-900">
              {
                <a
                  href={"https://docs.metacentrum.cz/en/docs/computing/jobs/extend-walltime"}
                  {...({
                    target: "_blank",
                    rel: "noopener noreferrer",
                  })}
                >
                  {formatTimestamp(job.completedBy)} <Icon icon="mdi:open-in-new" className="inline w-[11px] h-[11px] text-grey" />
                </a>
              }
            </div>
          </div>
        )}
        {job.obitAt && (
          <div>
            <div className="text-sm text-gray-500">{t("jobs.obitAt")}</div>
            <div className="text-sm text-gray-900">
              {formatTimestamp(job.obitAt)}
            </div>
          </div>
        )}
        {job.lastStateChangeAt && (
          <div>
            <div className="text-sm text-gray-500">
              {t("jobs.lastStateChangeAt")}
            </div>
            <div className="text-sm text-gray-900">
              {formatTimestamp(job.lastStateChangeAt)}
            </div>
          </div>
        )}
        {job.kerberosTicketAt && (
          <div>
            <div className="text-sm text-gray-500">
              {t("jobs.kerberosTicketAt")}
            </div>
            <div className="text-sm text-gray-900">
              {formatTimestamp(job.kerberosTicketAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

