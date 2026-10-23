import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { getImpersonatedUsername, normalizedBaseUrl } from "@/lib/api-client";

interface SeptikDownloadButtonProps {
  jobId: string;
}

/**
 * Downloads septik data (job files from S3) of the job
 */
export function SeptikDownloadButton({ jobId }: SeptikDownloadButtonProps) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      const impersonatedUsername = getImpersonatedUsername();
      if (impersonatedUsername) {
        headers["X-Impersonate-User"] = impersonatedUsername;
      }

      const url = `${normalizedBaseUrl}/septik/${encodeURIComponent(jobId)}`;
      // Only check the status here, the data itself is downloaded by the browser
      const response = await fetch(url, { credentials: "include", headers });
      await response.body?.cancel();

      if (!response.ok) {
        if (response.status === 404) {
          setError(t("jobs.septik.notFound"));
        } else if (response.status === 403) {
          setError(t("jobs.septik.forbidden"));
        } else {
          setError(t("jobs.septik.failed"));
        }
        return;
      }

      // Native download streams to disk (no buffering in memory) and has browser progress/cancel.
      // It is sent without X-Impersonate-User, so an impersonating admin downloads as admin.
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError(t("jobs.septik.failed"));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Icon
          icon={isDownloading ? "mdi:loading" : "mdi:download"}
          className={`w-4 h-4 ${isDownloading ? "animate-spin" : ""}`}
        />
        {isDownloading
          ? t("jobs.septik.downloading")
          : t("jobs.septik.download")}
      </button>
    </div>
  );
}
