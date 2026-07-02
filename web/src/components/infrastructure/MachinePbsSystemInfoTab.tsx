import { useTranslation } from "react-i18next";

interface MachinePbsSystemInfoTabProps {
  rawAttributes: Record<string, string> | null;
}

export function MachinePbsSystemInfoTab({
  rawAttributes,
}: MachinePbsSystemInfoTabProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 sm:px-6 py-4">
      {rawAttributes ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("machines.attribute")}
                </th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("machines.value")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(rawAttributes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-normal sm:whitespace-nowrap text-sm font-mono text-gray-900 break-words">
                      {key}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 break-all">
                      {String(value)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500">{t("machines.noSystemInfo")}</div>
      )}
    </div>
  );
}
