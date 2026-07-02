import { useTranslation } from "react-i18next";
import type { SubjobDTO } from "@/lib/generated-api";
import { Link } from "react-router-dom";

interface JobSubjobsSectionProps {
  subjobs: SubjobDTO[];
}

export function JobSubjobsSection({ subjobs }: JobSubjobsSectionProps) {
  const { t } = useTranslation();

  if (subjobs.length === 0) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("jobs.subjobs")} ({subjobs.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.subjobId")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.stateLabel")}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.node")}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.cpu")}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.memory")}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.cpuTimeUsed")}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.runtime")}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("jobs.exitCode")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subjobs.map((subjob) => (
              <tr key={subjob.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                  <Link
                    to={`/jobs/${subjob.id}`}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {subjob.id}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (subjob as any).stateColor || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {String(
                      t(
                        `jobs.state.${String((subjob as any).stateName || subjob.state || "")}`,
                        {
                          default: String(
                            (subjob as any).stateName || subjob.state || ""
                          ),
                        }
                      )
                    )}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {subjob.node ? (
                    <Link
                      to={`/machines/${String(subjob.node)}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {String(subjob.node)}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {Number(subjob.cpuReserved)}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {Number(subjob.memoryReserved).toFixed(2)} GB
                  {typeof subjob.memoryUsed === "number" &&
                    subjob.memoryUsed !== null && (
                      <span className="text-gray-400 ml-1">
                        ({Number(subjob.memoryUsed).toFixed(2)} GB)
                      </span>
                    )}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {String(subjob.cpuTimeUsed || "-")}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {String(subjob.runtime || "-")}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {typeof subjob.exitCode === "number" &&
                  subjob.exitCode !== null &&
                  subjob.exitCode !== undefined ? (
                    <span
                      className={
                        subjob.exitCode === 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {subjob.exitCode}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
