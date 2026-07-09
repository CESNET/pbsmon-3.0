import { memo } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

interface QueuesSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const QueuesSearchBar = memo(function QueuesSearchBar({
  searchQuery,
  onSearchChange,
}: QueuesSearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full sm:max-w-md mb-3">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon icon="mdi:magnify" className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("queues.searchPlaceholder")}
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
  );
});
