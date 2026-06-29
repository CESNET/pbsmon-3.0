import type { InfrastructureNodeListDTO } from "@/lib/generated-api";
import { ProgressBarMinimal } from "@/components/common/ProgressBarMinimal";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface NodePreviewProps {
  node: InfrastructureNodeListDTO;
  clusterName: string;
}

export function NodePreview({ node, clusterName }: NodePreviewProps) {
  const { t } = useTranslation();

  const getShortNodeName = (nodeName: string, clusterName: string): string => {
    if (nodeName.endsWith(`.${clusterName}`)) {
      const prefix = nodeName.slice(
        0,
        nodeName.length - clusterName.length - 1
      );
      return prefix;
    }
    if (nodeName === clusterName) {
      return nodeName;
    }
    const nodeParts = nodeName.split(".");
    const clusterParts = clusterName.split(".");

    for (let i = 0; i < nodeParts.length; i++) {
      if (i >= clusterParts.length || nodeParts[i] !== clusterParts[i]) {
        return nodeParts.slice(0, i + 1).join(".");
      }
    }

    return nodeParts[0] || nodeName;
  };

  const shortNodeName = getShortNodeName(node.name, clusterName);

  const getStateInfo = (
    state?: string | null
  ): { label: string; color: string; colorLight: string; } | null => {
    if (!state) {
      return null; // No PBS detected - no state to show
    }
    switch (state) {
      case "free":
        return {
          label: t("machines.nodeState.free"),
          color: "#22c55e",
          colorLight: "#6ed393",
        };
      case "partially_used":
        return {
          label: t("machines.nodeState.partiallyUsed"),
          color: "#86efac",
          colorLight: "#bcf3d0",
        };
      case "used":
        return {
          label: t("machines.nodeState.used"),
          color: "#3b82f6",
          colorLight: "#86b1f8",
        };
      case "maintenance":
        return {
          label: t("machines.nodeState.maintenance") || "Maintenance",
          color: "#f59e0b",
          colorLight: "#fed590",
        };
      case "not-available":
        return {
          label: t("machines.nodeState.notAvailable") || "Not Available",
          color: "#ef4444",
          colorLight: "#ee7a7a",
        };
      case "unknown":
      default:
        return {
          label: t("machines.nodeState.unknown"),
          color: "#eab308",
          colorLight: "#f6d36b",
        };
    }
  };

  const getCpuUsagePercent = (): number => {
    if (node.cpuUsagePercent === null || node.cpuUsagePercent === undefined) {
      return 0;
    }
    if (typeof node.cpuUsagePercent === "number") {
      return node.cpuUsagePercent;
    }
    return Number(node.cpuUsagePercent) || 0;
  };

  const getGpuUsagePercent = (): number | null => {
    if (node.gpuUsagePercent === null || node.gpuUsagePercent === undefined) {
      return null;
    }
    if (typeof node.gpuUsagePercent === "number") {
      return node.gpuUsagePercent;
    }
    return Number(node.gpuUsagePercent) || null;
  };

  const cpuUsage = getCpuUsagePercent();
  const gpuUsage = getGpuUsagePercent();
  const gpuCount =
    node.gpuCount !== null &&
    node.gpuCount !== undefined &&
    typeof node.gpuCount === "number"
      ? node.gpuCount
      : null;
  const hasGpu = gpuUsage !== null || (gpuCount !== null && gpuCount > 0);

  const getCpuGpuColorClass = (percent: number): string => {
    if (percent <= 10) {
      return "#5D7085";
    } else if (percent < 95) {
      return "#5D7085";
    } else {
      return "#5D7085";
    }
  };

  const stateInfo = getStateInfo(node.actualState);
  const cpuAssigned = node.cpuAssigned || 0;
  const unavailable =
    node.actualState === "not-available" ||
    node.actualState === "unknown" ||
    (node.actualState === "maintenance" && cpuAssigned === 0);
  const hasPbs = node.actualState !== null && node.actualState !== undefined;
  const shouldShowProgressBars = hasPbs && !unavailable;

  const formatMemory = (gb: number): string => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)}TB`;
    }
    return `${gb.toFixed(0)}GB`;
  };

  return (
    <Link
      to={`/machines/${encodeURIComponent(node.name)}`}
      style={stateInfo && stateInfo.color && { backgroundColor: stateInfo.color } || undefined}
      className="relative px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-primary-500 hover:shadow-md transition-all block w-full"
    >
      <div className="mb-3 sm:mb-4">
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {shortNodeName}
            </h3>
            {node.ostack !== null && node.ostack !== undefined && (
              <span title="Cloud node">
                <Icon
                  icon="mdi:cloud"
                  className="w-4 h-4 text-gray-500 flex-shrink-0"
                />
              </span>
            )}
          </div>
        </div>
      </div>

      {unavailable ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2 ">
            <span>CPU </span>
            <span className="flex items-center gap-2">
              <span>{node.cpu}</span>
              <Icon icon="solar:cpu-bold" className="w-4 h-4 flex-shrink-0" />
            </span>
          </div>
          {node.memoryTotal !== null &&
            typeof node.memoryTotal === "number" && (
              <div className="flex items-center justify-between gap-2">
                <span>RAM </span>
                <span className="flex items-center gap-2">
                  <span>{formatMemory(node.memoryTotal)}</span>
                  <Icon icon="ph:memory" className="w-4 h-4 flex-shrink-0" />
                </span>
              </div>
            )}
          {hasGpu && gpuCount !== null && (
            <div className="flex items-center justify-between gap-2">
              <span>GPU </span>
              <span className="flex items-center gap-2">
                <span>{gpuCount}</span>
                <Icon icon="solar:gpu-bold" className="w-4 h-4 flex-shrink-0" />
              </span>
            </div>
          )}
          {/* Cloud node info */}
          {node.ostack !== null && node.ostack !== undefined && (
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon icon="mdi:cloud" className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">
                  Cloud Node
                </span>
              </div>
              {node.ostack.cpuCount !== null &&
                node.ostack.cpuCount !== undefined && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-600">Cloud CPU</span>
                    <span className="flex items-center gap-1.5">
                      <span>{node.ostack.cpuCount}</span>
                      <Icon
                        icon="solar:cpu-bold"
                        className="w-3.5 h-3.5 flex-shrink-0"
                      />
                    </span>
                  </div>
                )}
              {node.ostack.vmCount !== null &&
                node.ostack.vmCount !== undefined && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-600">VMs</span>
                    <span>{node.ostack.vmCount}</span>
                  </div>
                )}
            </div>
          )}
        </div>
      ) : (
        shouldShowProgressBars && (
          <div className="space-y-2 sm:space-y-3">
            <ProgressBarMinimal
              label="CPU"
              value={
                (node as any).cpuAssigned !== null &&
                (node as any).cpuAssigned !== undefined &&
                typeof (node as any).cpuAssigned === "number"
                  ? `${(node as any).cpuAssigned} / ${node.cpu}`
                  : node.cpu
              }
              percent={cpuUsage}
              color={getCpuGpuColorClass}
              backgroundColor={stateInfo?.colorLight}
              tooltip={
                (node as any).cpuAssigned !== null &&
                (node as any).cpuAssigned !== undefined &&
                typeof (node as any).cpuAssigned === "number" &&
                (node as any).cpuAssigned > node.cpu
                  ? t("machines.overcommitted")
                  : undefined
              }
            />

            {hasGpu && (
              <div>
                <ProgressBarMinimal
                  label="GPU"
                  value={
                    gpuCount !== null
                      ? `${
                          node.gpuAssigned &&
                          typeof node.gpuAssigned === "number"
                            ? node.gpuAssigned
                            : 0
                        } / ${gpuCount}`
                      : "GPU"
                  }
                  percent={gpuUsage !== null ? gpuUsage : 0}
                  color={getCpuGpuColorClass}
                  backgroundColor={stateInfo?.colorLight}
                  tooltip={
                    node.gpuAssigned &&
                    typeof node.gpuAssigned === "number" &&
                    gpuCount !== null &&
                    node.gpuAssigned > gpuCount
                      ? t("machines.overcommitted")
                      : undefined
                  }
                />
              </div>
            )}

            {node.memoryUsagePercent !== null &&
              node.memoryUsagePercent !== undefined &&
              node.memoryTotal !== null &&
              node.memoryUsed !== null &&
              typeof node.memoryTotal === "number" &&
              typeof node.memoryUsed === "number" &&
              typeof node.memoryUsagePercent === "number" && (
                <ProgressBarMinimal
                  label="RAM"
                  value={
                    node.memoryTotal > 1000
                      ? `${Number(node.memoryUsed/1024).toFixed(1)} / ${Number(node.memoryTotal/1024).toFixed(1)} T`
                      : `${Number(node.memoryUsed).toFixed(0)} / ${Number(node.memoryTotal).toFixed(0)} G`
                  }
                  percent={Number(node.memoryUsagePercent)}
                  color="#5D7085"
                  backgroundColor={stateInfo?.colorLight}
                  tooltip={
                    Number(node.memoryUsed) > Number(node.memoryTotal)
                      ? t("machines.overcommitted")
                      : undefined
                  }
                />
              )}

            {/* Cloud node info */}
            {node.ostack !== null && node.ostack !== undefined && (
              <div className="pt-2 mt-2 border-t border-gray-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon icon="mdi:cloud" className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">
                    Cloud Node
                  </span>
                </div>
                {node.ostack.cpuCount !== null &&
                  node.ostack.cpuCount !== undefined && (
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="text-gray-600">Cloud CPU</span>
                      <span className="flex items-center gap-1.5">
                        <span>{node.ostack.cpuCount}</span>
                        <Icon
                          icon="solar:cpu-bold"
                          className="w-3.5 h-3.5 flex-shrink-0"
                        />
                      </span>
                    </div>
                  )}
                {node.ostack.vmCount !== null &&
                  node.ostack.vmCount !== undefined && (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">VMs</span>
                      <span>{node.ostack.vmCount}</span>
                    </div>
                  )}
              </div>
            )}
          </div>
        )
      )}
    </Link>
  );
}
