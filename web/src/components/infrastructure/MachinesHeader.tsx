import { useTranslation } from "react-i18next";
import { MachinesFilterableHeader } from "./MachinesFilterableHeader";

interface MachinesHeaderProps {
  filterData: any | null;
  machineFilters: [string, string | number][]| null;
  onFilterChange: (filter: [string, string | number][] | null) => void;
}

export function MachinesHeader({
  filterData,
  machineFilters,
  onFilterChange,
}: MachinesHeaderProps) {
  const { t } = useTranslation();

  // Calculate grid columns based on which columns are hidden
  let gridCols: string;
  gridCols = "grid-cols-[1fr_1fr_1fr_1fr]";

  const numResources = machineFilters?.filter(([key]) =>
    key === 'resources'
  ).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div
        className={`grid ${gridCols} gap-2 text-sm font-medium text-gray-700`}
      >
        <MachinesFilterableHeader
          name="states"
          filterData={filterData?.states}
          machineFilters={machineFilters}
          onFilterChange={onFilterChange}
        >
          {t("machines.state")}
        </MachinesFilterableHeader>

        <MachinesFilterableHeader
          name="queues"
          filterData={filterData?.queues}
          machineFilters={machineFilters}
          onFilterChange={onFilterChange}
          enableSearch={true}
        >
          {t("machines.queue")}
        </MachinesFilterableHeader>

        <MachinesFilterableHeader
          name="clusters"
          filterData={filterData?.clusters}
          machineFilters={machineFilters}
          onFilterChange={onFilterChange}
          enableSearch={true}
        >
          {t("machines.cluster")}
        </MachinesFilterableHeader>
      { typeof numResources === 'number' && numResources > 0 &&
        [...Array(numResources)].map((_, i) => (
          <MachinesFilterableHeader
            name={'resources'}
            filterData={filterData?.resources}
            machineFilters={machineFilters}
            onFilterChange={onFilterChange}
            enableSearch={true}
            index={i}
          >
            {t("machines.resource")}
          </MachinesFilterableHeader>
        ))
      }
      { (
          <MachinesFilterableHeader
            name={'resources'}
            filterData={filterData?.resources}
            machineFilters={machineFilters}
            onFilterChange={onFilterChange}
            enableSearch={true}
            index={numResources ? numResources : 0}
          >
            {t("machines.resource")}
          </MachinesFilterableHeader>
        )
      }
      </div>
    </div>
  );
}
