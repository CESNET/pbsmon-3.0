import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useInfrastructure } from "@/hooks/useInfrastructure";
import { OrganizationPreview } from "@/components/infrastructure/OrganizationPreview";
import { MetacentrumTotal } from "@/components/infrastructure/MetacentrumTotal";
import { QuickLinksSidebar } from "@/components/infrastructure/QuickLinksSidebar";
import { MachineSearchBar } from "@/components/infrastructure/MachineSearchBar";

export function MachinesPage() {
  const [machineSearch, setMachineSearch] = useState("");
  const handleMachinePageChange = (query: string) => {
    setMachineSearch(query);
  }
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useInfrastructure({
    search: machineSearch.trim() || undefined
  });

  const currentLanguage = i18n.language as "cs" | "en";

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.machines")}
          </h1>
        </div>
      </header>
      <div className="flex gap-6 p-6">
        {/* Main Content */}
        <div className="flex-1">
          <MachineSearchBar
            searchQuery={machineSearch}
            onSearchChange={handleMachinePageChange}
            totalMachines={data?.meta?.totalNodes || 0}
          />

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {error instanceof Error
                  ? error.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Metacentrum Total Info */}
              {data.meta && <MetacentrumTotal meta={data.meta} />}

              {/* Organizations */}
              {data.data.map((organization) => (
                <OrganizationPreview
                  key={organization.id}
                  organization={organization}
                  currentLanguage={currentLanguage}
                />
              ))}
            </>
          )}
        </div>

        {/* Right Sidebar - Hot Links */}
        {data && data.data.length > 0 && (
          <QuickLinksSidebar
            organizations={data.data}
            currentLanguage={currentLanguage}
          />
        )}
      </div>
    </>
  );
}
