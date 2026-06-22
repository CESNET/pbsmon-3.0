import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import type { InfrastructureOrganizationListDTO } from "@/lib/generated-api";

interface QuickLinksSidebarProps {
  organizations: InfrastructureOrganizationListDTO[];
  currentLanguage: "cs" | "en";
}

export function QuickLinksSidebar({
  organizations,
  currentLanguage,
}: QuickLinksSidebarProps) {
  const { t } = useTranslation();
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  const scrollToElement = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleOrganization = (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  if (organizations.length === 0) {
    return null;
  }

  return (
    <aside className="hidden [@media(min-width:1650px)]:block w-72">
      <div className="sticky top-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-[calc(100vh)] flex flex-col">
        <h3 className="text-lg font-bold text-primary-900 mb-4 flex-shrink-0">
          {t("machines.quickLinks")}
        </h3>
        <nav className="space-y-2 overflow-y-auto flex-1">
          {organizations.map((organization) => {
            const isExpanded = expandedOrgs.has(organization.id);
            return (
              <div key={organization.id} className="space-y-1">
                <div className="flex items-center">
                  <button
                    onClick={(e) => toggleOrganization(organization.id, e)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <Icon
                      icon="mdi:chevron-right"
                      className={`w-4 h-4 text-gray-600 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => scrollToElement(`org-${organization.id}`)}
                    className="flex-1 text-left px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mdi:office-building" className="w-4 h-4" />
                    {organization.name[currentLanguage]}
                  </button>
                </div>
                {isExpanded && (
                  <div className="pl-4 space-y-1">
                    {organization.clusters
                      .filter((cluster) => cluster.nodes.length > 0)
                      .map((cluster) => (
                        <button
                          key={cluster.id}
                          onClick={() =>
                            scrollToElement(`cluster-${cluster.id}`)
                          }
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
                        >
                          <Icon icon="mdi:server" className="w-4 h-4" />
                          {cluster.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
