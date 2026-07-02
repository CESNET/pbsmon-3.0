import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Project } from "./types";

interface ProjectsTableRowProps {
  project: Project;
}

export function ProjectsTableRow({ project }: ProjectsTableRowProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  return (
    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
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
      </td>
      <td className="px-4 sm:px-6 py-4">
        <div className="flex items-center min-w-0">
          <Icon icon="mdi:folder" className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
          <div className="min-w-0">
            <Link
              to={`/projects/${project.id}`}
              title={project.name}
              className="inline-block max-w-[10rem] sm:max-w-xs align-bottom truncate text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              {project.name}
            </Link>
            {project.isPersonal && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                <Icon icon="mdi:account" className="w-3 h-3 mr-1" />
                {t("projects.personal")}
              </span>
            )}
            {project.isMyProject && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                <Icon icon="mdi:star" className="w-3 h-3 mr-1" />
                {t("projects.myProject")}
              </span>
            )}
          </div>
        </div>
      </td>
      {!isCompact && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 flex gap-2">
            <div>
              {t("projects.vms")}: {project.reservedResources.vmCount}
            </div>
            <div className="text-gray-500">
              {t("projects.vcpus")}: {project.reservedResources.vcpus}
            </div>
            <div className="text-gray-500">
              {t("projects.memory")}: {project.reservedResources.memoryGb} GB
            </div>
          </div>
        </td>
      )}
    </tr>
  );
}
