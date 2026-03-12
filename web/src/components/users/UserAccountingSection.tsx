import { useTranslation } from "react-i18next";
import type { UserInfoDTO } from "@/lib/generated-api";

interface UserAccountingSectionProps {
  accountingData: UserInfoDTO | null;
  isLoading: boolean;
  error: Error | null;
}

function formatCpuTime(seconds: number, t: any): string {
  if (seconds === 0) return "0";

  const secondsYear = 365 * 24 * 3600;
  const secondsDay = 24 * 3600;
  const years = Math.floor(seconds / secondsYear);
  const days = Math.floor((seconds % secondsYear) / secondsDay);
  const hours = Math.floor(((seconds % secondsYear) % secondsDay) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (years > 0) {
    return `${years} ${
      years === 1
        ? t("users.accounting.year1")
        : (years < 5 ? t("users.accounting.years4") : t("users.accounting.years5plus"))
      } ${days} ${
      days === 1
        ? t("users.accounting.day1")
        : (days < 5 ? t("users.accounting.days4") : t("users.accounting.days5plus"))
      } ${hours}h ${minutes}m ${secs}s`;
  } else if (days > 0){
    return `${days} ${
      days === 1
        ? t("users.accounting.day1")
        : (days < 5 ? t("users.accounting.days4") : t("users.accounting.days5plus"))
    } ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  }
  return num.toFixed(0);
}

export function UserAccountingSection({
  accountingData,
  isLoading,
  error,
}: UserAccountingSectionProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-gray-500">{t("common.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-red-600 text-sm">
          {t("common.errorLoading")}: {error.message}
        </div>
      </div>
    );
  }

  if (!accountingData) {
    return (
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-gray-500 text-sm">
          {t("users.accounting.notAvailable")}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("users.accounting.title")}
      </h2>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">
            {t("users.accounting.totalJobs")}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatLargeNumber(accountingData.jobCount)}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">
            {t("users.accounting.totalCpuTime")}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCpuTime(accountingData.totalCpuTime, t)}
          </div>
        </div>
      </div>

      {/* Yearly Usage Breakdown */}
      {accountingData.usages && accountingData.usages.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            {t("users.accounting.yearlyUsage")}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.accounting.year")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.accounting.jobs")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.accounting.cpuTime")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountingData.usages.map((usage) => (
                  <tr key={usage.year} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usage.year}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatLargeNumber(usage.jobCount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatCpuTime(usage.cpuTime, t)}
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

