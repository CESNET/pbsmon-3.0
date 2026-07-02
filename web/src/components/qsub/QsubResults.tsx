import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { NodePreview } from "@/components/infrastructure/NodePreview";
import type { InfrastructureNodeListDTO } from "@/lib/generated-api";
import { Tabs } from "@/components/common/Tabs";
import { MachineLegend } from "@/components/infrastructure/MachineLegend";

export interface QualifiedNode extends InfrastructureNodeListDTO {
  canRunImmediately: boolean;
}

interface QsubResultsProps {
  qsubCommand: string;
  qsubScript: string;
  qualifiedNodes: QualifiedNode[];
  totalCount: number;
  immediatelyAvailableCount: number;
}

export function QsubResults({
  qsubCommand,
  qsubScript,
  qualifiedNodes,
  totalCount,
  immediatelyAvailableCount,
}: QsubResultsProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || "en").split("-")[0] as "en" | "cs";
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<"qualified" | "immediate">(
    immediatelyAvailableCount > 0 ? "immediate" : "qualified"
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    });
  };

  // Group nodes by cluster for display
  const nodesByCluster = qualifiedNodes.reduce(
    (acc, node) => {
      // Extract cluster name from node name (assuming format: node.cluster.domain)
      const parts = node.name.split(".");
      const clusterName =
        parts.length > 1 ? parts.slice(1).join(".") : "unknown";

      if (!acc[clusterName]) {
        acc[clusterName] = [];
      }
      acc[clusterName].push(node);
      return acc;
    },
    {} as Record<string, QualifiedNode[]>
  );

  // Group nodes by cluster for display
  const nodesByClusterImmeditely = qualifiedNodes
    .filter((node) => node.canRunImmediately)
    .reduce(
    (acc, node) => {
      // Extract cluster name from node name (assuming format: node.cluster.domain)
      const parts = node.name.split(".");
      const clusterName =
        parts.length > 1 ? parts.slice(1).join(".") : "unknown";

      if (!acc[clusterName]) {
        acc[clusterName] = [];
      }
      acc[clusterName].push(node);
      return acc;
    },
    {} as Record<string, QualifiedNode[]>
  );

  const tabs = [
    {
      id: "qualified",
      label: currentLang === "cs" ? `Kvalifikované (${totalCount})` : `Qualified (${totalCount})`,
      content: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {currentLang === "cs"
              ? `Kvalifikované uzly (${totalCount})`
              : `Qualified Nodes (${totalCount})`}
          </h2>

          {qualifiedNodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {currentLang === "cs"
                ? "Žádné uzly nesplňují zadaná kritéria"
                : "No nodes match the specified criteria"}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(nodesByCluster).map(([clusterName, nodes]) => (
                <div key={clusterName}>
                  <h3 className="text-md font-medium text-gray-700 mb-3">
                    {clusterName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {nodes.map((node) => (
                      <div
                        key={node.name}
                        className={`relative ${
                          node.canRunImmediately
                            ? "rounded-lg border-2 border-green-500"
                            : ""
                        }`}
                      >
                        <NodePreview
                          node={node as InfrastructureNodeListDTO}
                          clusterName={clusterName}
                        />
                        {node.canRunImmediately && (
                          <div className="absolute top-0 right-0 z-10">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">
                              <Icon
                                icon="solar:check-circle-bold"
                                className="w-3 h-3 sm:w-4 sm:h-4 text-green-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "immediate",
      label: currentLang === "cs" ? `Okamžitě dostupné (${immediatelyAvailableCount})` : `Immediately Available (${immediatelyAvailableCount})`,
      content: (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {currentLang === "cs"
              ? `Okamžitě dostupné uzly (${immediatelyAvailableCount})`
              : `Immediately Available Nodes (${immediatelyAvailableCount})`}
          </h2>

          {immediatelyAvailableCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {currentLang === "cs"
                ? "Žádné uzly nejsou okamžitě dostupné"
                : "No nodes immediately available"}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(nodesByClusterImmeditely).map(([clusterName, nodes]) => (
                <div key={clusterName}>
                  <h3 className="text-md font-medium text-gray-700 mb-3">
                    {clusterName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {nodes.map((node) => (
                      <div
                        key={node.name}
                        className={`relative ${
                          node.canRunImmediately
                            ? "rounded-lg border-2 border-green-500"
                            : ""
                        }`}
                      >
                        <NodePreview
                          node={node as InfrastructureNodeListDTO}
                          clusterName={clusterName}
                        />
                        {node.canRunImmediately && (
                          <div className="absolute top-0 right-0 z-10">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">
                              <Icon
                                icon="solar:check-circle-bold"
                                className="w-3 h-3 sm:w-4 sm:h-4 text-green-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5" />
            <span className="font-medium">
              {currentLang === "cs" ? "Zkopírováno" : "Copied"}
            </span>
          </div>
        </div>
      )}

      {/* QSUB Command */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentLang === "cs" ? "QSUB příkaz" : "QSUB Command"}
          </h2>
        </div>
        <div className="bg-gray-50 rounded-md p-4 font-mono text-sm border border-gray-200 relative">
          <button
            onClick={() => copyToClipboard(qsubCommand)}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            title={currentLang === "cs" ? "Kopírovat" : "Copy"}
          >
            <Icon icon="solar:copy-bold" className="w-4 h-4" />
          </button>
          <code className="text-gray-800 pr-8 block whitespace-pre-wrap break-all">{qsubCommand}</code>
        </div>
      </div>

      {/* QSUB Shell Script */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentLang === "cs" ? "QSUB shell script" : "QSUB Shell Script"}
          </h2>
        </div>
        <div className="bg-gray-50 rounded-md p-4 font-mono text-sm border border-gray-200 relative overflow-x-auto">
          <button
            onClick={() => copyToClipboard(qsubScript)}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            title={currentLang === "cs" ? "Kopírovat" : "Copy"}
          >
            <Icon icon="solar:copy-bold" className="w-4 h-4" />
          </button>
          <code className="text-gray-800 pr-8 block whitespace-pre-wrap break-all">{qsubScript}</code>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {currentLang === "cs" ? "Statistiky" : "Statistics"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-gray-600 mb-1">
              {currentLang === "cs"
                ? "Celkem kvalifikovaných uzlů"
                : "Total Qualified Nodes"}
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          </div>
          <div className="bg-green-50 rounded-md p-4">
            <div className="text-sm text-gray-600 mb-1">
              {currentLang === "cs"
                ? "Okamžitě dostupné uzly"
                : "Immediately Available Nodes"}
            </div>
            <div className="text-2xl font-bold text-green-700">
              {immediatelyAvailableCount}
            </div>
          </div>
        </div>
      </div>

      {/* State Legend */}
      {<MachineLegend />}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) =>
              setActiveTab(tabId as "qualified" | "immediate")
            }
          />
        </div>
      </div>
    </div>
  );
}
