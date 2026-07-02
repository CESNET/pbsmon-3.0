import { useTranslation } from "react-i18next";
import { ProgressBar } from "@/components/common/ProgressBar";
import type { StorageSpacesDTO } from "@/lib/generated-api";
import { UserStorageQuotasSection } from "./UserStorageQuotasSection";
import type { UserStorageQuotasData } from "@/hooks/useUserStorageQuotas";

interface StorageSpacesContentProps {
  data: StorageSpacesDTO;
  quotasData?: UserStorageQuotasData;
}

/**
 * Get color for storage usage percentage
 * - Green: < 70%
 * - Yellow: 70-90%
 * - Red: >= 90%
 */
function getStorageColor(percent: number): string {
  if (percent >= 90) {
    return "#ef4444"; // red-500
  } else if (percent >= 70) {
    return "#eab308"; // yellow-500
  }
  return "#22c55e"; // green-500
}

/**
 * Format free space for display
 */
function formatFreeSpace(freeTiB: number): string {
  if (freeTiB >= 1024) {
    const piB = freeTiB / 1024;
    const rounded = Math.round(piB * 10) / 10;
    return `${rounded} PiB`;
  }
  return `${Math.round(freeTiB)} TiB`;
}

export function StorageSpacesContent({ data, quotasData }: StorageSpacesContentProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {quotasData && <UserStorageQuotasSection data={quotasData} />}

      {/* Scratch Storage Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          {t("storageSpaces.scratchStorage.title")}
        </h2>
        <p className="text-gray-700 mb-2">
          {t("storageSpaces.scratchStorage.description")}
        </p>
        <p className="text-gray-700">
          {t("storageSpaces.scratchStorage.warning")}
        </p>
      </div>

      {/* Disk Arrays Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {t("storageSpaces.diskArrays.title")}
          </h2>
        </div>

        <p className="text-gray-700 px-4 sm:px-6 py-4 pt-1">
          {t("storageSpaces.diskArrays.description")}
        </p>

        <div className="px-4 sm:px-6 py-4 space-y-4">
          {data.storageSpaces.map((space) => {
            const freeSpaceFormatted = formatFreeSpace(space.freeTiB);
            const label = `${space.directory} - ${t("storageSpaces.table.freeSpace")}: ${freeSpaceFormatted}`;

            return (
              <ProgressBar
                key={space.directory}
                label={label}
                value={space.formattedSize}
                percent={space.usagePercent}
                color={getStorageColor(space.usagePercent)}
              />
            );
          })}
        </div>

        {/* Totals */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-600">
                {t("storageSpaces.totals.total")}
              </span>
              <span className="ml-2 font-semibold text-gray-900">
                {data.formattedTotal}
              </span>
            </div>
            <div>
              <span className="text-gray-600">
                {t("storageSpaces.totals.used")}
              </span>
              <span className="ml-2 font-semibold text-gray-900">
                {data.formattedTotalUsed}
              </span>
            </div>
            <div>
              <span className="text-gray-600">
                {t("storageSpaces.totals.free")}
              </span>
              <span className="ml-2 font-semibold text-gray-900">
                {data.formattedTotalFree}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
