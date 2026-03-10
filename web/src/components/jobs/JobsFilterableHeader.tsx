import { useTranslation } from "react-i18next";

export type JobFilterableState = "all" | "Q" | "R|B" | "C|F|X" | "E" | "H" | "S" | "T|M" | "W";

interface JobsFilterableHeaderProps {
  filterableStates?: Record<string, string> | null;
  stateFilter?: JobFilterableState;
  onStateFilterChange?: (state: JobFilterableState) => void;
}


function convertPbsStateToFilterableState(pbsState: string): JobFilterableState {
  const state = pbsState?.toUpperCase() || 'all';

  switch (state) {
    case 'Q':
      return "Q";
    case 'R':
    case 'B':
      return "R|B";
    case 'C':
    case 'F':
    case 'X':
      return "C|F|X";
    case 'E':
      return "E";
    case 'H':
      return "H";
    case 'S':
      return "S";
    case 'T':
    case 'M':
      return "T|M";
    case 'W':
      return "W";
    default:
      return "all"; // Default to "all" for unrecognized states
  }
}

export function JobsFilterableHeader({
  filterableStates,
  stateFilter,
  onStateFilterChange,
}: JobsFilterableHeaderProps) {
  const { t } = useTranslation();

  console.log("Filterable states:", filterableStates);
  const stateOptions: { value: JobFilterableState; label: string }[] = [
    { value: "all", label: t("jobs.all") },
    ...(filterableStates
      ? Object.values(
          Object.entries(filterableStates).reduce((acc, [value, name]) => {
            const filterValue = convertPbsStateToFilterableState(value);
            // Only add if this category hasn't been added yet
            if (!acc[filterValue]) {
              acc[filterValue] = {
                value: filterValue,
                label: t(`jobs.state.${name}`),
              };
            }
            return acc;
          }, {} as Record<string, { value: JobFilterableState; label: string }>)
        )
      : []),
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
