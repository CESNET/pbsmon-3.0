import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { InfrastructureOrganizationListDTO } from "@/lib/generated-api";
import { ClusterPreview } from "./ClusterPreview";

interface OrganizationPreviewProps {
  organization: InfrastructureOrganizationListDTO;
  currentLanguage: "cs" | "en";
}

export const OrganizationPreview = memo(function OrganizationPreview({
  organization,
  currentLanguage,
}: OrganizationPreviewProps) {
  const { t } = useTranslation();

  // Calculate total CPU for the organization
  const totalCpu = organization.clusters.reduce(
    (sum, cluster) => sum + cluster.totalCpu,
    0
  );

  return (
    <div
      id={`org-${organization.id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6"
    >
      {/* Organization Header */}
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-primary-900 mb-2">
          {organization.name[currentLanguage]}
          <span className="ml-2 text-sm font-normal text-gray-600">
            ({totalCpu} {t("machines.totalCpu")})
          </span>
        </h2>
      </div>

      {/* Clusters */}
      {organization.clusters.map((cluster) => (
        <ClusterPreview key={cluster.id} cluster={cluster} />
      ))}
    </div>
  );
});
