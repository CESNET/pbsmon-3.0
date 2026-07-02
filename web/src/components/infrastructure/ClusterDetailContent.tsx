import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { NodePreview } from "./NodePreview";

interface ClusterDetailContentProps {
  cluster: {
    id: string;
    name: string;
    cluster: string;
    desc?: { cs: string; en: string } | null;
    spec?: { cs: string; en: string } | null;
    cpudesc?: string | null;
    gpudesc?: string | null;
    photo?: string | null;
    thumbnail?: string | null;
    memory?: string | null;
    disk?: { cs: string; en: string } | null;
    network?: { cs: string; en: string } | null;
    comment?: { cs: string; en: string } | null;
    owner?: { cs: string; en: string } | null;
    vos?: string[] | null;
    machines?: Array<{
      name: string;
      cpu: number;
      pbs?: {
        name: string;
        actualState?: string | null;
        cpuUsagePercent?: number | null;
        cpuAssigned?: number | null;
        gpuUsagePercent?: number | null;
        gpuCount?: number | null;
        gpuAssigned?: number | null;
        gpuCapability?: string | null;
        gpuMemory?: string | null;
        cudaVersion?: string | null;
        memoryTotal?: number | null;
        memoryUsed?: number | null;
        memoryUsagePercent?: number | null;
        jobs?: string[] | null;
        queues?: any[] | null;
        rawPbsAttributes?: Record<string, string> | null;
        outages?: Array<Record<string, any>> | null;
      } | null;
    }> | null;
  };
}

export function ClusterDetailContent({ cluster }: ClusterDetailContentProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language as "cs" | "en") || "en";

  // Helper function to get localized string
  const getLocalized = (
    value: { cs: string; en: string } | null | undefined
  ): string => {
    if (!value) return "";
    return value[currentLanguage] || value.en || value.cs || "";
  };

  // Calculate cluster statistics
  const clusterStats = useMemo(() => {
    const machines = cluster.machines || [];
    const totalCpu = machines.reduce((sum, node) => sum + (node.cpu || 0), 0);
    const totalNodes = machines.length;

    // Count nodes by state
    const stateCounts = {
      free: 0,
      partially_used: 0,
      used: 0,
      maintenance: 0,
      "not-available": 0,
      unknown: 0,
      noPbs: 0,
    };

    machines.forEach((node) => {
      if (!node.pbs || !node.pbs.actualState) {
        stateCounts.noPbs++;
      } else {
        const state = node.pbs.actualState;
        if (state in stateCounts) {
          stateCounts[state as keyof typeof stateCounts]++;
        } else {
          stateCounts.unknown++;
        }
      }
    });

    return {
      totalCpu,
      totalNodes,
      stateCounts,
    };
  }, [cluster.machines]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900 break-words">
            {t("pages.clusterDetail")}: {cluster.name}
          </h1>
        </div>
      </header>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("machines.basicInformation")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">
                  {t("machines.clusterName")}
                </div>
                <div className="text-lg font-medium text-gray-900">
                  {cluster.name}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">
                  {t("machines.totalNodes")}
                </div>
                <div className="text-lg font-medium text-gray-900">
                  {clusterStats.totalNodes}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">
                  {t("machines.totalCpu")}
                </div>
                <div className="text-lg font-medium text-gray-900">
                  {clusterStats.totalCpu}
                </div>
              </div>
              {cluster.memory && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.memory")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {cluster.memory}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description and Specifications */}
        {(getLocalized(cluster.desc) ||
          getLocalized(cluster.spec) ||
          cluster.cpudesc ||
          cluster.gpudesc ||
          getLocalized(cluster.disk) ||
          getLocalized(cluster.network) ||
          getLocalized(cluster.comment) ||
          getLocalized(cluster.owner) ||
          (cluster.vos && cluster.vos.length > 0)) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("machines.specifications")}
              </h2>
              <div className="space-y-4">
                {getLocalized(cluster.desc) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.description")}
                    </div>
                    <div className="text-gray-900">
                      {getLocalized(cluster.desc)}
                    </div>
                  </div>
                )}
                {getLocalized(cluster.spec) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.specification")}
                    </div>
                    <div className="text-gray-900">
                      {getLocalized(cluster.spec)}
                    </div>
                  </div>
                )}
                {cluster.cpudesc && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.cpuDescription")}
                    </div>
                    <div className="text-gray-900">{cluster.cpudesc}</div>
                  </div>
                )}
                {cluster.gpudesc && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.gpuDescription")}
                    </div>
                    <div className="text-gray-900">{cluster.gpudesc}</div>
                  </div>
                )}
                {getLocalized(cluster.disk) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.disk")}
                    </div>
                    <div className="text-gray-900">
                      {getLocalized(cluster.disk)}
                    </div>
                  </div>
                )}
                {getLocalized(cluster.network) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.network")}
                    </div>
                    <div className="text-gray-900">
                      {getLocalized(cluster.network)}
                    </div>
                  </div>
                )}
                {getLocalized(cluster.comment) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.comment")}
                    </div>
                    <div className="text-gray-900">
                      {getLocalized(cluster.comment)}
                    </div>
                  </div>
                )}
                {getLocalized(cluster.owner) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.owner")}
                    </div>
                    <div className="text-gray-900">
                      {getLocalized(cluster.owner)}
                    </div>
                  </div>
                )}
                {cluster.vos && cluster.vos.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {t("machines.virtualOrganizations")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.vos.map((vo) => (
                        <span
                          key={vo}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {vo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cluster Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("machines.clusterStatistics")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {clusterStats.stateCounts.free > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.nodeState.free")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts.free}
                  </div>
                </div>
              )}
              {clusterStats.stateCounts.partially_used > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.nodeState.partiallyUsed")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts.partially_used}
                  </div>
                </div>
              )}
              {clusterStats.stateCounts.used > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.nodeState.used")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts.used}
                  </div>
                </div>
              )}
              {clusterStats.stateCounts.maintenance > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.nodeState.maintenance")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts.maintenance}
                  </div>
                </div>
              )}
              {clusterStats.stateCounts["not-available"] > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.nodeState.notAvailable") || "Not Available"}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts["not-available"]}
                  </div>
                </div>
              )}
              {clusterStats.stateCounts.unknown > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.nodeState.unknown")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts.unknown}
                  </div>
                </div>
              )}
              {clusterStats.stateCounts.noPbs > 0 && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.noPbs")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {clusterStats.stateCounts.noPbs}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nodes Grid */}
        {cluster.machines && cluster.machines.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("machines.nodes")} ({cluster.machines.length})
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {cluster.machines.map((node) => {
                  // Transform detail DTO to list DTO format for NodePreview
                  const transformedNode = {
                    name: node.name,
                    cpu: node.cpu,
                    actualState: node.pbs?.actualState ?? null,
                    cpuUsagePercent: node.pbs?.cpuUsagePercent ?? null,
                    cpuAssigned: node.pbs?.cpuAssigned ?? null,
                    gpuUsagePercent: node.pbs?.gpuUsagePercent ?? null,
                    gpuCount: node.pbs?.gpuCount ?? null,
                    gpuAssigned: node.pbs?.gpuAssigned ?? null,
                    gpuCapability: node.pbs?.gpuCapability ?? null,
                    gpuMemory: node.pbs?.gpuMemory ?? null,
                    cudaVersion: node.pbs?.cudaVersion ?? null,
                    memoryTotal: node.pbs?.memoryTotal ?? null,
                    memoryUsed: node.pbs?.memoryUsed ?? null,
                    memoryUsagePercent: node.pbs?.memoryUsagePercent ?? null,
                  };
                  return (
                    <NodePreview
                      key={node.name}
                      node={transformedNode as any}
                      clusterName={cluster.name}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
