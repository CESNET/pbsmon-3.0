import { useTranslation } from "react-i18next";

export type JobFilterableState = "all" | "Q" | "R|B" | "C|F|X" | "E" | "H" | "S" | "T|M" | "W";

interface JobsFilterableHeaderProps {
  stateFilter?: JobFilterableState;
  onStateFilterChange?: (state: JobFilterableState) => void;
}


export function JobsFilterableHeader({
  stateFilter,
  onStateFilterChange,
}: JobsFilterableHeaderProps) {
  const { t } = useTranslation();

  const stateOptions: { value: JobFilterableState; label: string }[] = [
    { value: "all", label: t("jobs.all") },
    { value: "Q", label: t("jobs.state.queued") },
    { value: "R|B", label: t("jobs.state.running") },
    { value: "C|F|X", label: t("jobs.state.completed") },
    { value: "H", label: t("jobs.state.held") },
  ];

  return (
        <div className="flex items-center">
          <select
            value={stateFilter || "all"}
            onChange={(e) => {
              const newFilter = e.target.value as JobFilterableState;
              onStateFilterChange?.(newFilter);
            }}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {stateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
  );
}
