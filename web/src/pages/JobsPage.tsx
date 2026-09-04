import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { useJobsSummary } from "@/hooks/useJobsSummary";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { JobsSearchBar } from "@/components/jobs/JobsSearchBar";
import { JobsTable } from "@/components/jobs/JobsTable";
import { WaitingJobsTable } from "@/components/jobs/WaitingJobsTable";
import { WaitingJobsSummary } from "@/components/jobs/WaitingJobsSummary";
import { Pagination } from "@/components/common/Pagination";
import { Tabs } from "@/components/common/Tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useJobsPageSize } from "@/hooks/useJobsPageSize";
import type { JobFilterableState } from "@/components/jobs/JobsFilterableHeader";

type SortColumn =
  | "id"
  | "name"
  | "queue"
  | "state"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

type WaitingSortColumn =
  | "id"
  | "name"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

export function JobsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"all" | "waiting" | "my">(
    tabParam === "waiting" ? "waiting" : tabParam === "my" ? "my" : "all"
  );
  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise still
  // show the Waiting Jobs tab on a screen too short to comfortably use it.
  const isMobile = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === "waiting") {
      setSearchParams({ tab: "waiting" }, { replace: true });
    } else if (activeTab === "my") {
      setSearchParams({ tab: "my" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  // Waiting Jobs isn't shown on phones (its wide comment/reason column
  // doesn't work well on narrow screens) - bounce away from it if needed.
  useEffect(() => {
    if (isMobile && activeTab === "waiting") {
      setActiveTab("all");
    }
  }, [isMobile, activeTab]);

  // Job list page size - shared and persisted (localStorage) across all tabs
  const [jobsPageSize, setJobsPageSize] = useJobsPageSize();

  // All Jobs tab state
  const [allJobsPage, setAllJobsPage] = useState(1);
  const [allJobsSort, setAllJobsSort] = useState<SortColumn>("createdAt");
  const [allJobsOrder, setAllJobsOrder] = useState<"asc" | "desc">("desc");
  const [allJobsSearch, setAllJobsSearch] = useState("");
  const [allStateFilter, setAllStateFilter] = useState<JobFilterableState>("all");

  // Waiting Jobs tab state
  const [waitingJobsPage, setWaitingJobsPage] = useState(1);
  const [waitingJobsSort, setWaitingJobsSort] =
    useState<WaitingSortColumn>("createdAt");
  const [waitingJobsOrder, setWaitingJobsOrder] = useState<"asc" | "desc">(
    "desc"
  );
  const [waitingJobsSearch, setWaitingJobsSearch] = useState("");
  const [commentFilter, setCommentFilter] = useState<string | null>(null);

  // My Jobs tab state
  const [myJobsPage, setMyJobsPage] = useState(1);
  const [myJobsSort, setMyJobsSort] = useState<SortColumn>("createdAt");
  const [myJobsOrder, setMyJobsOrder] = useState<"asc" | "desc">("desc");
  const [myJobsSearch, setMyJobsSearch] = useState("");
  const [myStateFilter, setMyStateFilter] = useState<JobFilterableState>("all");

  const { data: currentUser } = useCurrentUser();
  const currentUsername = currentUser?.username?.split("@")[0] || "";

  // Fetch all jobs
  const {
    data: allJobsData,
    isLoading: allJobsLoading,
    error: allJobsError,
  } = useJobs({
    page: allJobsPage,
    limit: jobsPageSize,
    sort: allJobsSort,
    order: allJobsOrder,
    search: allJobsSearch.trim() || undefined,
    state: allStateFilter === 'all' ? undefined : allStateFilter,
    enabled: activeTab === "all",
  });

  // Fetch waiting jobs
  const {
    data: waitingJobsData,
    isLoading: waitingJobsLoading,
    error: waitingJobsError,
  } = useJobs({
    page: waitingJobsPage,
    limit: jobsPageSize,
    sort: waitingJobsSort,
    order: waitingJobsOrder,
    search: waitingJobsSearch.trim() || undefined,
    state: "Q|W", // Filter for queued jobs only
    comment: (typeof commentFilter === "string") ? commentFilter : undefined,
    enabled: activeTab === "waiting",
  });

  // Fetch my jobs (filtered by current user's username)
  // Use owner filter to get only the current user's jobs
  const {
    data: myJobsData,
    isLoading: myJobsLoading,
    error: myJobsError,
  } = useJobs({
    page: myJobsPage,
    limit: jobsPageSize,
    sort: myJobsSort,
    order: myJobsOrder,
    search: myJobsSearch.trim() || undefined,
    owner: currentUsername || undefined, // Filter by current user's username
    state: myStateFilter === 'all' ? undefined : myStateFilter,
    enabled: activeTab === "my" && !!currentUsername,
  });

  const {
    data: summaryData,
  } = useJobsSummary({
    enabled: activeTab === "waiting",
  });

  // All Jobs handlers
  const handleAllJobsSort = (column: SortColumn) => {
    if (allJobsSort === column) {
      setAllJobsOrder(allJobsOrder === "asc" ? "desc" : "asc");
    } else {
      setAllJobsSort(column);
      setAllJobsOrder("desc");
    }
    setAllJobsPage(1);
  };

  const handleAllStateFilterChange = (state: JobFilterableState) => {
    setAllStateFilter(state);
    setMyJobsPage(1);
  };

  const handleAllJobsPageChange = (newPage: number) => {
    setAllJobsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAllJobsSearchChange = (query: string) => {
    setAllJobsSearch(query);
    setAllJobsPage(1);
  };

  // Waiting Jobs handlers
  const handleWaitingJobsSort = (column: WaitingSortColumn) => {
    if (waitingJobsSort === column) {
      setWaitingJobsOrder(waitingJobsOrder === "asc" ? "desc" : "asc");
    } else {
      setWaitingJobsSort(column);
      setWaitingJobsOrder("desc");
    }
    setWaitingJobsPage(1);
  };

  const handleWaitingJobsPageChange = (newPage: number) => {
    setWaitingJobsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleWaitingJobsSearchChange = (query: string) => {
    setWaitingJobsSearch(query);
    setWaitingJobsPage(1);
  };

  const handleFilterByReason = (reason: string) => {
    if (commentFilter === reason) {
      // Clear filter if clicking the same reason
      setCommentFilter(null);
    } else {
      // Set filter to this reason
      setCommentFilter(reason);
    }
    setWaitingJobsPage(1); // Reset to first page on filter
    setWaitingJobsSearch(""); // Clear search when filtering by reason
  };

  // My Jobs handlers
  const handleMyJobsSort = (column: SortColumn) => {
    if (myJobsSort === column) {
      setMyJobsOrder(myJobsOrder === "asc" ? "desc" : "asc");
    } else {
      setMyJobsSort(column);
      setMyJobsOrder("desc");
    }
    setMyJobsPage(1);
  };

  const handleMyStateFilterChange = (state: JobFilterableState) => {
    setMyStateFilter(state);
    setMyJobsPage(1);
  };

  const handleMyJobsPageChange = (newPage: number) => {
    setMyJobsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMyJobsSearchChange = (query: string) => {
    setMyJobsSearch(query);
    setMyJobsPage(1);
  };

  // Shared page size handler - resets every tab back to its first page
  const handleJobsPageSizeChange = (newSize: number) => {
    setJobsPageSize(newSize);
    setAllJobsPage(1);
    setWaitingJobsPage(1);
    setMyJobsPage(1);
  };

  const allJobsTotalPages = allJobsData?.meta?.totalCount
    ? Math.ceil(allJobsData.meta.totalCount / jobsPageSize)
    : 0;

  const waitingJobsTotalPages = waitingJobsData?.meta?.totalCount
    ? Math.ceil(waitingJobsData.meta.totalCount / jobsPageSize)
    : 0;

  const myJobsTotalPages = myJobsData?.meta?.totalCount
    ? Math.ceil(myJobsData.meta.totalCount / jobsPageSize)
    : 0;

  const tabs = [
    {
      id: "my",
      label: t("jobs.tabs.myJobs"),
      content: (
        <div>
          <JobsSearchBar
            searchQuery={myJobsSearch}
            onSearchChange={handleMyJobsSearchChange}
            totalJobs={myJobsData?.meta?.totalCount || 0}
            lastRunningCompletedBy={myJobsData?.meta?.lastRunningCompletedBy || null}
          />

          {myJobsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}

          {myJobsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {myJobsError instanceof Error
                  ? myJobsError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}

          {myJobsData && myJobsData.data && (
            <>
              <JobsTable
                jobs={myJobsData.data.jobs}
                sortColumn={myJobsSort}
                sortDirection={myJobsOrder}
                onSort={handleMyJobsSort}
                hideUserColumn={true}
                filterableStates={myJobsData.meta?.filterableStates || null}
                stateFilter={myStateFilter}
                onStateFilterChange={handleMyStateFilterChange}
              />
              <Pagination
                currentPage={myJobsPage}
                totalPages={myJobsTotalPages}
                onPageChange={handleMyJobsPageChange}
                pageSize={jobsPageSize}
                onPageSizeChange={handleJobsPageSizeChange}
              />
            </>
          )}
        </div>
      ),
    },
    {
      id: "all",
      label: t("jobs.tabs.allJobs"),
      content: (
        <div>
          <JobsSearchBar
            searchQuery={allJobsSearch}
            onSearchChange={handleAllJobsSearchChange}
            totalJobs={allJobsData?.meta?.totalCount || 0}
            lastRunningCompletedBy={allJobsData?.meta?.lastRunningCompletedBy || null}
          />

          {allJobsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}

          {allJobsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {allJobsError instanceof Error
                  ? allJobsError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}

          {allJobsData && allJobsData.data && (
            <>
              <JobsTable
                jobs={allJobsData.data.jobs}
                sortColumn={allJobsSort}
                sortDirection={allJobsOrder}
                onSort={handleAllJobsSort}
                filterableStates={allJobsData.meta?.filterableStates || null}
                stateFilter={allStateFilter}
                onStateFilterChange={handleAllStateFilterChange}
              />
              <Pagination
                currentPage={allJobsPage}
                totalPages={allJobsTotalPages}
                onPageChange={handleAllJobsPageChange}
                pageSize={jobsPageSize}
                onPageSizeChange={handleJobsPageSizeChange}
              />
            </>
          )}
        </div>
      ),
    },
    {
      id: "waiting",
      label: t("jobs.tabs.waitingJobs"),
      content: (
        <div>
          <JobsSearchBar
            searchQuery={waitingJobsSearch}
            onSearchChange={handleWaitingJobsSearchChange}
            totalJobs={waitingJobsData?.meta?.totalCount || 0}
            lastRunningCompletedBy={null}
          />

          {waitingJobsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}

          {waitingJobsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {waitingJobsError instanceof Error
                  ? waitingJobsError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}

          {waitingJobsData && waitingJobsData.data && (
            <>
              {summaryData && (
                <WaitingJobsSummary
                  summary={summaryData}
                  onFilterByReason={handleFilterByReason}
                  activeFilter={commentFilter}
                />
              )}

              <WaitingJobsTable
                jobs={waitingJobsData.data.jobs}
                sortColumn={waitingJobsSort}
                sortDirection={waitingJobsOrder}
                onSort={handleWaitingJobsSort}
              />
              <Pagination
                currentPage={waitingJobsPage}
                totalPages={waitingJobsTotalPages}
                onPageChange={handleWaitingJobsPageChange}
                pageSize={jobsPageSize}
                onPageSizeChange={handleJobsPageSizeChange}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  const visibleTabs = isMobile ? tabs.filter((tab) => tab.id !== "waiting") : tabs;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
            {t("pages.jobs")}
          </h1>
        </div>
      </header>
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4">
            <Tabs
              tabs={visibleTabs}
              activeTab={activeTab}
              onTabChange={(tabId) =>
                setActiveTab(tabId as "all" | "waiting" | "my")
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
