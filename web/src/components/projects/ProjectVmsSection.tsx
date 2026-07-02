import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type ProjectVm = {
  id: string;
  name: string;
  flavorName: string;
  vcpus: number;
  memoryGb: number;
};

interface ProjectVmsSectionProps {
  vms: ProjectVm[];
}

export function ProjectVmsSection({ vms }: ProjectVmsSectionProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  if (vms.length === 0) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("projects.vms")}
        </h2>
        <div className="text-center text-gray-500 py-8">
          <Icon
            icon="mdi:server-off"
            className="w-12 h-12 mx-auto mb-2 text-gray-400"
          />
          <p>{t("projects.noVms")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("projects.vms")} ({vms.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("projects.vmName")}
              </th>
              {!isCompact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("projects.vmId")}
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("projects.flavor")}
              </th>
              {!isCompact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("projects.vcpus")}
                </th>
              )}
              {!isCompact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("projects.memory")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vms.map((vm) => (
              <tr key={vm.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Icon
                      icon="mdi:server"
                      className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-900 break-all">
                      {vm.name}
                    </span>
                  </div>
                </td>
                {!isCompact && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {vm.id}
                    </code>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{vm.flavorName}</span>
                </td>
                {!isCompact && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{vm.vcpus}</span>
                  </td>
                )}
                {!isCompact && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {vm.memoryGb} GB
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
