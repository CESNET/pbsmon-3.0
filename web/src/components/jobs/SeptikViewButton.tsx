import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { getImpersonatedUsername, normalizedBaseUrl } from "@/lib/api-client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface SeptikViewButtonProps {
  jobId: string;
}

interface SeptikContentFile {
  archive: string;
  event: string;
  path: string;
  size: number;
  mtime?: string;
  binary: boolean;
  truncated: boolean;
  content?: string;
}

interface SeptikContents {
  events: string[];
  files: SeptikContentFile[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Highlights PBS spool files: stdout (.OU), stderr (.ER) and job script (.SC)
function pathColorClass(path: string): string {
  const upper = path.toUpperCase();
  if (upper.endsWith(".OU")) return "text-green-600";
  if (upper.endsWith(".ER")) return "text-red-600";
  if (upper.endsWith(".SC")) return "text-blue-600";
  return "";
}

// Archive name is <jobId>_<host>_..._<event>.tar.gz, the host is shortened
function archiveHost(archive: string): string {
  return archive.split("_")[1]?.split(".")[0] ?? "";
}

const EVENT_ORDER = ["end", "epilogue", "prologue"];

function eventRank(event: string): number {
  const rank = EVENT_ORDER.indexOf(event);
  return rank === -1 ? EVENT_ORDER.length : rank;
}

// Sorts files by event (end, epilogue, prologue) and then by short host name
function sortFiles(files: SeptikContentFile[]): SeptikContentFile[] {
  return [...files].sort(
    (a, b) =>
      eventRank(a.event) - eventRank(b.event) ||
      archiveHost(a.archive).localeCompare(archiveHost(b.archive)),
  );
}

// Keeps only the file from the most prioritized event for the same host and file name
function dedupeFiles(files: SeptikContentFile[]): SeptikContentFile[] {
  const seen = new Set<string>();
  return files.filter((f) => {
    const key = `${archiveHost(f.archive)}/${f.path.split("/").pop()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Shows content of septik data (job files from S3) of the job
 */
export function SeptikViewButton({ jobId }: SeptikViewButtonProps) {
  const { t } = useTranslation();
  const { impersonatedUsername } = useImpersonation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<SeptikContents | null>(null);
  const [selected, setSelected] = useState(0);

  const handleView = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      const impersonateHeader = getImpersonatedUsername();
      if (impersonateHeader) {
        headers["X-Impersonate-User"] = impersonateHeader;
      }

      const url = `${normalizedBaseUrl}/septik/${encodeURIComponent(jobId)}/contents`;
      const response = await fetch(url, { credentials: "include", headers });

      if (!response.ok) {
        if (response.status === 404) {
          setError(t("jobs.septik.notFound"));
        } else if (response.status === 403) {
          setError(t("jobs.septik.forbidden"));
        } else {
          setError(t("jobs.septik.viewFailed"));
        }
        return;
      }

      const data: SeptikContents = await response.json();
      setContents({ ...data, files: dedupeFiles(sortFiles(data.files)) });
      setSelected(0);
    } catch {
      setError(t("jobs.septik.viewFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => setContents(null);

  useEffect(() => {
    if (!contents) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [contents]);

  const showArchive = new Set(contents?.files.map((f) => f.archive)).size > 1;
  const file = contents?.files[selected];

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <button
        type="button"
        onClick={handleView}
        disabled={isLoading}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Icon
          icon={isLoading ? "mdi:loading" : "mdi:eye-outline"}
          className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
        />
        {isLoading ? t("jobs.septik.loading") : t("jobs.septik.view")}
      </button>

      {contents && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6 ${
            // Keep the dialog above the fixed impersonation banner (~60px)
            impersonatedUsername ? "pb-[68px] sm:pb-[84px]" : ""
          }`}
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="septik-view-title"
            className="w-full max-w-7xl h-full bg-white rounded-lg shadow-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200">
              <h2
                id="septik-view-title"
                className="text-base font-semibold text-gray-900 truncate"
              >
                {jobId}
                {contents.events.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({contents.events.join(", ")})
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={t("jobs.septik.close")}
                className="p-1 text-gray-500 hover:text-gray-900 rounded"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            {contents.files.length === 0 ? (
              <p className="p-4 text-sm text-gray-600">
                {t("jobs.septik.empty")}
              </p>
            ) : (
              <div className="flex flex-col md:flex-row flex-1 min-h-0">
                <ul className="md:w-80 max-h-48 md:max-h-none shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200 text-sm">
                  {contents.files.map((f, i) => (
                    <li key={`${f.archive}/${f.path}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(i)}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 border-l-4 ${
                          i === selected
                            ? "bg-primary-200 border-primary-700 text-primary-900"
                            : "border-transparent text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block break-all font-mono text-xs">
                            <span className="text-gray-500">
                              [{f.event}][{archiveHost(f.archive)}]
                            </span>{" "}
                            <span className={pathColorClass(f.path)}>
                              {f.path}
                            </span>
                          </span>
                          {showArchive && (
                            <span className="block truncate text-xs text-gray-400">
                              {f.archive}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatSize(f.size)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                  {file?.truncated && (
                    <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200">
                      {t("jobs.septik.truncated")}
                    </p>
                  )}
                  {file?.binary ? (
                    <p className="p-4 text-sm text-gray-600">
                      {t("jobs.septik.binary")}
                    </p>
                  ) : (
                    <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-900 whitespace-pre">
                      {file?.content}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
