import { useTranslation } from "react-i18next";
import type { InfrastructureListMetaDto } from "@/lib/generated-api";

interface MetacentrumOverviewProps {
  meta: InfrastructureListMetaDto;
}

export function MetacentrumOverview({ meta }: MetacentrumOverviewProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-primary-900 mb-4">
        {t("machines.metacentrumOverview")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-gray-600">
            {t("machines.totalOrganizations")}
          </div>
          <div className="text-2xl font-bold text-primary-900">
            {meta.totalOrganizations}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">
            {t("machines.totalClusters")}
          </div>
          <div className="text-2xl font-bold text-primary-900">
            {meta.totalClusters}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">
            {t("machines.totalNodes")}
          </div>
          <div className="text-2xl font-bold text-primary-900">
            {meta.totalNodes}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">{t("machines.totalCpu")}</div>
          <div className="text-2xl font-bold text-primary-900">
            {meta.totalCpu}
          </div>
        </div>
        {meta.totalGpu !== null && meta.totalGpu !== undefined && (
          <div>
            <div className="text-sm text-gray-600">
              {t("machines.totalGpu")}
            </div>
            <div className="text-2xl font-bold text-primary-900">
              {meta.totalGpu ?? "-"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
