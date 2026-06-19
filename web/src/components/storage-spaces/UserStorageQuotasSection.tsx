import { useTranslation } from "react-i18next";
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

function formatGrace(v: string | null): string {
  if (!v) return "—";
  return v;
}

export function UserStorageQuotasSection({
  data,
}: UserStorageQuotasSectionProps) {
  const { t } = useTranslation();

  if (!data.quotas || data.quotas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
      <div className="px-6 py-4 border-b border-gray-100">
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
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.softQuota")}
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.hardQuota")}
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.grace")}
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.filesUsed")}
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.filesLimit")}
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                {t("storageSpaces.userQuotas.filesGrace")}
              </th>
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
                <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-xs truncate">
                  {quota.directory}
                </td>
                <td className="px-4 py-3 text-right text-gray-800">
                  {quota.used}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {formatQuota(quota.softQuota)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {formatQuota(quota.hardQuota)}
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {formatGrace(quota.grace)}
                </td>
                <td className="px-4 py-3 text-right text-gray-800">
                  {formatNumber(quota.filesUsed)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {quota.filesSoftLimit !== null || quota.filesHardLimit !== null
                    ? `${formatNumber(quota.filesSoftLimit)} / ${formatNumber(quota.filesHardLimit)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {formatGrace(quota.filesGrace)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
