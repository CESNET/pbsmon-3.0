import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useClusterDetail } from "@/hooks/useClusterDetail";
import { ClusterDetailContent } from "@/components/infrastructure/ClusterDetailContent";

export function ClusterDetailPage() {
  const { t } = useTranslation();
  const { clusterId } = useParams<{ clusterId: string }>();
  const { data, isLoading, error } = useClusterDetail(clusterId || "");

  if (isLoading) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {t("pages.clusterDetail")}
            </h1>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("common.loading")}</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {t("pages.clusterDetail")}
            </h1>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              {t("common.errorLoading")}{" "}
              {error instanceof Error
                ? error.message
                : t("common.unknownError")}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data || data.type !== "Cluster" || !data.cluster) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {t("pages.clusterDetail")}
            </h1>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <div className="text-center text-gray-500 py-12">
            {t("machines.clusterNotFound")}
          </div>
        </div>
      </>
    );
  }

  return <ClusterDetailContent cluster={data.cluster as any} />;
}
