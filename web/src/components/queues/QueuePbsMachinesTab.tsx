import { useTranslation } from "react-i18next";
import { useInfrastructure } from "@/hooks/useInfrastructure";
import { NodePreview } from "@/components/infrastructure/NodePreview";
import type { InfrastructureNodeListDTO } from "@/lib/generated-api";

interface QueuePbsMachinesTabProps {
  queueName: string;
  additionalAttributes: Record<string, string> | null;
}

interface MachineWithCluster {
  node: InfrastructureNodeListDTO;
  clusterName: string;
}

function filterMachinesByQueue(
  infrastructure: any,
  queueName: string,
  additionalAttributes: Record<string, string> | null
): MachineWithCluster[] {
  const machines: MachineWithCluster[] = [];

  if (!infrastructure?.data) {
    return machines;
  }

  // Extract just the queue name without server suffix for comparison
  const queueNameOnly = queueName.split("@")[0];

  for (const org of infrastructure.data) {
    for (const cluster of org.clusters || []) {
      for (const node of cluster.nodes || []) {
        // Check if node has the queue in its queueNames list
        if (node.queueNames && node.queueNames.length > 0) {
          const hasQueue = node.queueNames.some(
            (q: string) =>
              q === queueNameOnly ||
              q === queueName ||
              q.startsWith(queueNameOnly + "@") ||
              q === `q_${queueNameOnly}` ||
              q === additionalAttributes?.["default_chunk.queue_list"]
          );
          if (hasQueue) {
            machines.push({
              node,
              clusterName: cluster.name,
            });
          }
        }
      }
    }
  }

  return machines;
}

export function QueuePbsMachinesTab({
  queueName,
  additionalAttributes
}: QueuePbsMachinesTabProps) {
  const { t } = useTranslation();
  const { data: infrastructureData, isLoading, error } = useInfrastructure();

  const machines = infrastructureData
    ? filterMachinesByQueue(infrastructureData, queueName, additionalAttributes)
    : [];

  if (isLoading) {
    return (
      <div>
        <div className="text-gray-500">{t("common.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-red-600">
          {t("common.errorLoading")}{" "}
          {error instanceof Error ? error.message : t("common.unknownError")}
        </div>
      </div>
    );
  }

  if (machines.length === 0) {
    return (
      <div>
        <div className="text-gray-500">{t("queues.noMachines")}</div>
      </div>
    );
  }

  // Group machines by cluster
  const machinesByCluster = new Map<string, MachineWithCluster[]>();
  for (const machine of machines) {
    if (!machinesByCluster.has(machine.clusterName)) {
      machinesByCluster.set(machine.clusterName, []);
    }
    machinesByCluster.get(machine.clusterName)!.push(machine);
  }

  // Calculate total statistics
  const totalCpu = machines.reduce(
    (sum, machine) => sum + (machine.node.cpu || 0),
    0
  );
  const totalGpu = machines.reduce((sum, machine) => {
    const gpuCount =
      machine.node.gpuCount !== null &&
      machine.node.gpuCount !== undefined &&
      typeof machine.node.gpuCount === "number"
        ? machine.node.gpuCount
        : 0;
    return sum + gpuCount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-primary-900 mb-4">
          {t("queues.machineStatistics")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">
              {t("queues.totalMachines")}
            </div>
            <div className="text-2xl font-bold text-primary-900">
              {machines.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">
              {t("machines.totalCpu")}
            </div>
            <div className="text-2xl font-bold text-primary-900">
              {totalCpu}
            </div>
          </div>
          {totalGpu > 0 && (
            <div>
              <div className="text-sm text-gray-600">
                {t("machines.totalGpu")}
              </div>
              <div className="text-2xl font-bold text-primary-900">
                {totalGpu}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Machines by cluster */}
      {Array.from(machinesByCluster.entries()).map(
        ([clusterName, clusterMachines]) => (
          <div key={clusterName} className="mb-6 last:mb-0">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-primary-800 mb-2">
                {clusterName}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {clusterMachines.map((machine) => (
                <NodePreview
                  key={machine.node.name}
                  node={machine.node}
                  clusterName={machine.clusterName}
                />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
