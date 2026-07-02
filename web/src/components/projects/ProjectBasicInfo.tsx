import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { Tooltip } from "react-tooltip";
import type { ProjectDetailDTO } from "@/lib/generated-api";

interface ProjectBasicInfoProps {
  project: ProjectDetailDTO;
}

export function ProjectBasicInfo({ project }: ProjectBasicInfoProps) {
  const { t } = useTranslation();

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("projects.basicInfo")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">{t("projects.name")}</div>
          <div className="flex items-center gap-2 min-w-0">
            <Icon icon="mdi:folder" className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div
              className="flex-1 min-w-0 break-all text-lg font-medium text-gray-900"
              title={project.name}
            >
              {project.name}
            </div>
            {project.isPersonal && (
              <>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 cursor-help"
                  data-tooltip-id="personal-project-tooltip"
                  data-tooltip-content={t("projects.personalTooltip")}
                >
                  <Icon icon="mdi:account" className="w-3 h-3 mr-1" />
                  {t("projects.personal")}
                </span>
                <Tooltip
                  id="personal-project-tooltip"
                  style={{ maxWidth: "300px", whiteSpace: "normal" }}
                />
              </>
            )}
            {project.isMyProject && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                <Icon icon="mdi:star" className="w-3 h-3 mr-1" />
                {t("projects.myProject")}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t("projects.id")}</div>
          <div className="text-sm font-medium text-gray-900 font-mono">
            {project.id}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t("projects.status")}</div>
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {project.status === "active"
                ? t("projects.statusActive")
                : t("projects.statusExpired")}
            </span>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">
            {t("projects.reservedResources")}
          </div>
          <div className="text-lg font-medium text-gray-900">
            <div className="flex flex-col gap-1">
              <div>
                {t("projects.vms")}: {project.reservedResources.vmCount}
              </div>
              <div className="text-sm text-gray-600">
                {t("projects.vcpus")}: {project.reservedResources.vcpus} |{" "}
                {t("projects.memory")}: {project.reservedResources.memoryGb} GB
              </div>
            </div>
          </div>
        </div>
      </div>
      {project.description && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-1">
            {t("projects.description")}
          </div>
          <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap break-all">
            {typeof project.description === "string"
              ? project.description
              : JSON.stringify(project.description)}
          </div>
        </div>
      )}
    </div>
  );
}
