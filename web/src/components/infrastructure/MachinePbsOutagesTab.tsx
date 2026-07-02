import { useTranslation } from "react-i18next";
import { useNodeOutages } from "@/hooks/useNodeOutages";
import type { OutageRecordDTO } from "@/lib/generated-api";

interface MachinePbsOutagesTabProps {
  nodeName: string | null;
}

export function MachinePbsOutagesTab({ nodeName }: MachinePbsOutagesTabProps) {
  const { t } = useTranslation();
  const { data: outages, isLoading, error } = useNodeOutages(nodeName);

  const formatDateTime = (
    date: Date | string | Record<string, any> | null | undefined
  ): string => {
    if (!date) {
      return "<null>";
    }

    try {
      // Handle Date object
      if (date instanceof Date) {
        const d = date;
        if (isNaN(d.getTime())) {
          return "<null>";
        }
        // Format: YYYY-MM-DD HH:MM:SS.microseconds +00:00
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        const hours = String(d.getUTCHours()).padStart(2, "0");
        const minutes = String(d.getUTCMinutes()).padStart(2, "0");
        const seconds = String(d.getUTCSeconds()).padStart(2, "0");
        const milliseconds = String(d.getUTCMilliseconds()).padStart(3, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}000 +00:00`;
      }

      // Handle string (ISO date string from JSON)
      if (typeof date === "string") {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
          return "<null>";
        }
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        const hours = String(d.getUTCHours()).padStart(2, "0");
        const minutes = String(d.getUTCMinutes()).padStart(2, "0");
        const seconds = String(d.getUTCSeconds()).padStart(2, "0");
        const milliseconds = String(d.getUTCMilliseconds()).padStart(3, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}000 +00:00`;
      }

      // Handle Record<string, any> (shouldn't happen, but handle it)
      return "<null>";
    } catch {
      return "<null>";
    }
  };

  const formatComment = (
    comment: string | Record<string, any> | null | undefined
  ): string => {
    if (!comment) {
      return "-";
    }
    if (typeof comment === "string") {
      return comment;
    }
    // If it's an object, try to stringify it (shouldn't happen normally)
    return String(comment);
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <div className="text-gray-500">{t("common.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <div className="text-red-600">
          {t("common.errorLoading")}{" "}
          {error instanceof Error ? error.message : t("common.unknownError")}
        </div>
      </div>
    );
  }

  if (!outages || outages.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <div className="text-gray-500">{t("machines.noOutages")}</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Time
              </th>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comment
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {outages.map((outage: OutageRecordDTO, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-900">
                  {outage.type || "-"}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {formatDateTime(outage.startTime)}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {formatDateTime(outage.endTime)}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900">
                  {formatComment(outage.comment)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
