import { memo } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

interface MachineSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalMachines: number;
}

export const MachineSearchBar = memo(function MachineSearchBar({
  searchQuery,
  onSearchChange,
  totalMachines,
}: MachineSearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="relative max-w-md flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon icon="mdi:magnify" className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("machines.searchPlaceholder")}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <Icon
              icon="mdi:close"
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
            />
          </button>
        )}
      </div>
      <div className="text-sm text-gray-600 whitespace-nowrap">
        {t("machines.searchTotalMachines", { count: totalMachines })}
      </div>
    </div>
  );
});
