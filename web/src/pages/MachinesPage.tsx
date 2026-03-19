import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { useInfrastructure, useInfrastructureFilterables } from "@/hooks/useInfrastructure";
import { OrganizationPreview } from "@/components/infrastructure/OrganizationPreview";
import { MetacentrumOverview } from "@/components/infrastructure/MetacentrumOverview";
import { QuickLinksSidebar } from "@/components/infrastructure/QuickLinksSidebar";
import { MachineSearchBar } from "@/components/infrastructure/MachineSearchBar";
import { MachinesHeader } from "@/components/infrastructure/MachinesHeader";

export function MachinesPage() {
  const [machineSearch, setMachineSearch] = useState("");
  const [machineFilters, setMachineFilters] = useState<[string, string | number][] | null>(null);
  const handleMachinePageChange = (query: string) => {
    setMachineSearch(query);
  }
  const handleMachineFilters = (query: [string, string | number][] | null) => {
    setMachineFilters(query);
  }
  const convertToQueryString = useCallback((data: [string, string | number][] | null, prefix: string) => {
    if (!data) return null;
    return data
      .map(([key, value]) => {
        const encodedKey = encodeURIComponent(`${prefix}[${key}]`);
        const encodedValue = encodeURIComponent(String(value));
        return `${encodedKey}=${encodedValue}`;
      })
      .join('&');
  }, []);
  const { t, i18n } = useTranslation();
  const { data: filterData, isLoading: filterIsLoading, error: filterError} = useInfrastructureFilterables();
  const { data, isLoading, error } = useInfrastructure({
    search: machineSearch.trim() || undefined,
    filters: convertToQueryString(machineFilters, 'filters') || undefined,
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

      <div className="flex gap-6 p-6 pb-0">
        <div className="flex-1">
          {filterIsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}

          {filterError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {filterError instanceof Error
                  ? filterError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}

          {filterData && (
            <MachinesHeader
              filterData={filterData.data}
              machineFilters={machineFilters}
              onFilterChange={handleMachineFilters}
            />
          )}
        </div>
      </div>

      <div className="flex gap-6 p-6 pt-0">
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
              {data.meta && <MetacentrumOverview meta={data.meta} />}

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
