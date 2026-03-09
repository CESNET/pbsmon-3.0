import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useJobs } from "@/hooks/useJobs";
import { JobsSearchBar } from "@/components/jobs/JobsSearchBar";
import { WaitingJobsTable } from "@/components/jobs/WaitingJobsTable";
import { WaitingJobsSummary } from "@/components/jobs/WaitingJobsSummary";
import { Pagination } from "@/components/common/Pagination";

type SortColumn =
  | "id"
  | "name"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

export function WaitingJobsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sort, setSort] = useState<SortColumn>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [commentFilter, setCommentFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useJobs({
    page,
    limit,
    sort,
    order,
    search: search.trim() || undefined,
    state: "Q", // Filter for queued jobs only
    comment: (typeof commentFilter === "string") ? commentFilter : undefined,
  });

  // Fetch all waiting jobs for summary (no pagination, no search filter)
  const { data: summaryData } = useJobs({
    page: 1,
    limit: 10000, // Large limit to get all jobs for summary
    sort: "createdAt",
    order: "desc",
    state: "Q", // Filter for queued jobs only
    // No search filter for summary - we want all jobs
  });

  const handleSort = (column: SortColumn) => {
    if (sort === column) {
      // Toggle order if same column
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default order
      setSort(column);
      setOrder("desc");
    }
    setPage(1); // Reset to first page on sort
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (query: string) => {
    setSearch(query);
    setPage(1); // Reset to first page on search
  };

  const handleFilterByReason = (reason: string) => {
    if (commentFilter === reason) {
      // Clear filter if clicking the same reason
      setCommentFilter(null);
    } else {
      // Set filter to this reason
      setCommentFilter(reason);
    }
    setPage(1); // Reset to first page on filter
    setSearch(""); // Clear search when filtering by reason
  };

  const totalPages = data?.meta?.totalCount
    ? Math.ceil(data.meta.totalCount / limit)
    : 0;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.waitingJobs")}
          </h1>
        </div>
      </header>
      <div className="p-6">
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

        {data && data.data && (
          <>
            {summaryData?.data?.jobs && (
              <WaitingJobsSummary
                jobs={summaryData.data.jobs}
                onFilterByReason={handleFilterByReason}
                activeFilter={commentFilter}
              />
            )}

            <JobsSearchBar
              searchQuery={search}
              onSearchChange={handleSearchChange}
              totalJobs={data?.meta?.totalCount || 0}
            />
            <WaitingJobsTable
              jobs={data.data.jobs}
              sortColumn={sort}
              sortDirection={order}
              onSort={handleSort}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </>
  );
}
