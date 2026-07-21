import { useTranslation } from "react-i18next";
import type { JobDetailDTO } from "@/lib/generated-api";
import { PrintAttributeValue } from "@/components/common/PrintAttribute";

interface JobSystemInfoSectionProps {
  job: JobDetailDTO;
}

export function JobSystemInfoSection({ job }: JobSystemInfoSectionProps) {
  const { t } = useTranslation();

  // Get raw attributes - handle both the new rawAttributes field and fallback to environmentVariables structure
  const rawAttributes = (job as any).rawAttributes as Record<string, any> | null || {};

  if (Object.keys(rawAttributes).length === 0) {
    return (
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("jobs.systemInformation")}
        </h2>
        <div className="text-gray-500">{t("machines.noSystemInfo")}</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("jobs.systemInformation")}
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("machines.attribute")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("machines.value")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(rawAttributes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                    {key}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 break-all">
                    {PrintAttributeValue({ attrKey: key, attrValue: value })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
