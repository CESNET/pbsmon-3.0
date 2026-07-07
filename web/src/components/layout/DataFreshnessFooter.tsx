import { useTranslation } from "react-i18next";
import { useDataFreshness } from "@/hooks/useDataFreshness";

function formatAge(
  timestampMs: number | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (timestampMs === undefined) return t("common.dataFreshness.unknown");

  const diffMs = Date.now() - timestampMs;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t("common.dataFreshness.justNow");

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 1)
    return t("common.dataFreshness.minutesAgo", { count: diffMin });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 1)
    return t("common.dataFreshness.hoursAgo", { count: diffHours });

  return t("common.dataFreshness.daysAgo", { count: diffDays });
}

export function DataFreshnessFooter() {
  const { t } = useTranslation();
  const { data } = useDataFreshness();

  if (!data) return null;

  const lines: { label: string; timestamp: number | undefined }[] = [
    ...Object.entries(data.pbs ?? {}).map(([server, timestamp]) => ({
      label: t("common.dataFreshness.pbs", { server }),
      timestamp,
    })),
    {
      label: t("common.dataFreshness.storageSpaces"),
      timestamp: data.storageSpaces,
    },
    {
      label: t("common.dataFreshness.storageQuotas"),
      timestamp: data.storageQuotas,
    },
    { label: t("common.dataFreshness.perun"), timestamp: data.perun },
    {
      label: t("common.dataFreshness.prometheus"),
      timestamp: data.prometheus,
    },
  ];

  return (
    <div className="mt-auto px-[14px] py-2 border-t border-primary-700/50 text-xs leading-tight text-white select-none">
      {lines.map(({ label, timestamp }) => (
        <div
          key={label}
          className="truncate"
          title={
            timestamp !== undefined ? new Date(timestamp).toLocaleString() : undefined
          }
        >
          {label}: {formatAge(timestamp, t)}
        </div>
      ))}
    </div>
  );
}
