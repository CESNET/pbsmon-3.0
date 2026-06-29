import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { InfrastructureClusterListDTO } from "@/lib/generated-api";
import { NodePreview } from "./NodePreview";

interface ClusterPreviewProps {
  cluster: InfrastructureClusterListDTO;
}

export const ClusterPreview = memo(function ClusterPreview({ cluster }: ClusterPreviewProps) {
  const { t } = useTranslation();

  if (cluster.nodes.length === 0) {
    return null;
  }

  return (
    <div id={`cluster-${cluster.id}`} className="mb-6 last:mb-0">
      {/* Cluster Header */}
      <div className="mb-3">
        <Link
          to={`/clusters/${encodeURIComponent(cluster.id)}`}
          className="text-lg font-semibold text-primary-800 mb-2 hover:text-primary-600 hover:underline inline-block"
        >
          {cluster.name}
          <span className="ml-2 text-sm font-normal text-gray-600">
            ({cluster.totalCpu} {t("machines.totalCpu")})
          </span>
        </Link>
      </div>

      {/* Nodes */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {cluster.nodes.map((node) => (
          <NodePreview key={node.name} node={node} clusterName={cluster.name} />
        ))}
      </div>
    </div>
  );
});
