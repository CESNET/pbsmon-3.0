import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { UserStorageQuotasData } from "@/hooks/useUserStorageQuotas";

interface UserStorageQuotasSectionProps {
  data: UserStorageQuotasData;
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function formatQuota(v: string | null): string {
  return v ?? "—";
}

const SIZE_UNITS = ["", "K", "M", "G", "T", "P", "E"];

// Parses sizes like "512", "1.5G", "20 MB", "3TiB", "100kB" into bytes.
// Returns null when the value is missing or cannot be parsed.
function parseSize(v: string | null): number | null {
  if (!v) return null;
  const m = v.trim().match(/^([\d.,]+)\s*([kmgtpe]?)(?:i?b)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (isNaN(n)) return null;
  return n * Math.pow(1024, SIZE_UNITS.indexOf(m[2].toUpperCase()));
}

// Color of the used value: green below soft limit, yellow when soft limit is
// reached, red from 90 % of hard limit. Undefined when no limit is set
// (zero limit is treated as no limit).
function usageColor(
  used: number | null,
  soft: number | null,
  hard: number | null
): string | undefined {
  const softLimit = soft && soft > 0 ? soft : null;
  const hardLimit = hard && hard > 0 ? hard : null;
  if (used === null || (softLimit === null && hardLimit === null)) {
    return undefined;
  }
  if (hardLimit !== null && used >= hardLimit * 0.9) return "#ef4444";
  if (softLimit !== null && used >= softLimit) return "#eab308";
  return "#22c55e";
}

function formatGrace(v: string | null): string {
  if (!v) return "—";
  return v;
}

export function UserStorageQuotasSection({
  data,
}: UserStorageQuotasSectionProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  if (!data.quotas || data.quotas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t("storageSpaces.userQuotas.title")}
        </h2>
        <p className="text-gray-500 text-sm">
          {t("storageSpaces.userQuotas.noData")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("storageSpaces.userQuotas.title")}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t("storageSpaces.userQuotas.username")}: <span className="font-medium text-gray-700">{data.username}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.directory")}
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.used")}
              </th>
              {!isCompact && (
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  {t("storageSpaces.userQuotas.softQuota")}
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.hardQuota")}
              </th>
              {!isCompact && (
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  {t("storageSpaces.userQuotas.grace")}
                </th>
              )}
              {!isCompact && (
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  {t("storageSpaces.userQuotas.filesUsed")}
                </th>
              )}
              {!isCompact && (
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  {t("storageSpaces.userQuotas.filesLimit")}
                </th>
              )}
              {!isCompact && (
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  {t("storageSpaces.userQuotas.filesGrace")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.quotas.map((quota, idx) => (
              <tr
                key={quota.directory}
                className={
                  idx % 2 === 0
                    ? "border-b border-gray-100"
                    : "bg-gray-50/50 border-b border-gray-100"
                }
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-[10rem] sm:max-w-xs truncate">
                  {quota.directory}
                </td>
                <td
                  className="px-4 py-3 text-right text-gray-800"
                  style={{
                    color: usageColor(
                      parseSize(quota.used),
                      parseSize(quota.softQuota),
                      parseSize(quota.hardQuota)
                    ),
                  }}
                >
                  {quota.used}
                </td>
                {!isCompact && (
                  <td className="px-4 py-3 text-right text-gray-500">
                    {formatQuota(quota.softQuota)}
                  </td>
                )}
                <td className="px-4 py-3 text-right text-gray-500">
                  {formatQuota(quota.hardQuota)}
                </td>
                {!isCompact && (
                  <td
                    className="px-4 py-3 text-center text-gray-500"
                    style={{
                      color: quota.grace === "expired" ? "#ef4444" : undefined,
                    }}
                  >
                    {formatGrace(quota.grace)}
                  </td>
                )}
                {!isCompact && (
                  <td
                    className="px-4 py-3 text-right text-gray-800"
                    style={{
                      color: usageColor(
                        quota.filesUsed,
                        quota.filesSoftLimit,
                        quota.filesHardLimit
                      ),
                    }}
                  >
                    {formatNumber(quota.filesUsed)}
                  </td>
                )}
                {!isCompact && (
                  <td className="px-4 py-3 text-right text-gray-500">
                    {quota.filesSoftLimit !== null || quota.filesHardLimit !== null
                      ? `${formatNumber(quota.filesSoftLimit)} / ${formatNumber(quota.filesHardLimit)}`
                      : "—"}
                  </td>
                )}
                {!isCompact && (
                  <td
                    className="px-4 py-3 text-center text-gray-500"
                    style={{
                      color:
                        quota.filesGrace === "expired" ? "#ef4444" : undefined,
                    }}
                  >
                    {formatGrace(quota.filesGrace)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
