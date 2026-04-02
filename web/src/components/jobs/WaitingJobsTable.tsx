import { useTranslation } from "react-i18next";
import type { JobListDTO } from "@/lib/generated-api";
import { WaitingJobsTableHeader } from "./WaitingJobsTableHeader";
import { WaitingJobsTableRow } from "./WaitingJobsTableRow";

type SortColumn =
  | "id"
  | "name"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

interface WaitingJobsTableProps {
  jobs: JobListDTO[];
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
}

export function WaitingJobsTable({
  jobs,
  sortColumn,
  sortDirection,
  onSort,
}: WaitingJobsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full">
      <div className="w-full">
        <WaitingJobsTableHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />

        {/* Table Body */}
        <div>
          {jobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {t("jobs.noJobsFound")}
            </div>
          ) : (
            jobs.map((job) => <WaitingJobsTableRow key={job.id} job={job} />)
          )}
        </div>
      </div>
    </div>
  );
}
