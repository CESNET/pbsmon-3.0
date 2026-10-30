import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useJobs, type JobsListResponse } from "@/hooks/useJobs";
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
import { useShowArchivedJobs } from "@/hooks/useShowArchivedJobs";
import { ArchivedJobsFilterSection, EMPTY_ARCHIVE_FILTER } from "@/components/jobs/ArchivedJobsFilterSection";
import { useArchivedJobs, type ArchivedJobsFilter, type ArchivedRangePreset } from "@/hooks/useArchivedJobs";
import type { JobFilterableState } from "@/components/jobs/JobsFilterableHeader";
import type { JobListDTO } from "@/lib/generated-api";

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

// Mirrors the API job comparator (jobs.service.ts sortJobs)
function compareJobs(
  a: JobListDTO,
  b: JobListDTO,
  sort: SortColumn,
  order: "asc" | "desc"
): number {
  const aVal = sort === "node" ? a.node || "" : a[sort];
  const bVal = sort === "node" ? b.node || "" : b[sort];

  if (aVal == null && bVal == null) return 0;
  if (aVal == null) return 1;
  if (bVal == null) return -1;

  if (typeof aVal === "string" && typeof bVal === "string") {
    return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  }
  if (typeof aVal === "number" && typeof bVal === "number") {
    return order === "asc" ? aVal - bVal : bVal - aVal;
  }
  return 0;
}

// Merges two job lists that are each already sorted by (sort, order)
function mergeSortedJobs(
  left: JobListDTO[],
  right: JobListDTO[],
  sort: SortColumn,
  order: "asc" | "desc"
): JobListDTO[] {
  const merged: JobListDTO[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (compareJobs(left[i], right[j], sort, order) <= 0) {
      merged.push(left[i++]);
    } else {
      merged.push(right[j++]);
    }
  }
  while (i < left.length) merged.push(left[i++]);
  while (j < right.length) merged.push(right[j++]);
  return merged;
}

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
  // Archived jobs - toggle is persisted (localStorage); draft filter is
  // edited in the form, applied filter is what was last submitted
  const [showArchivedJobs, setShowArchivedJobs] = useShowArchivedJobs();
  const [archivedFilter, setArchivedFilter] = useState<ArchivedJobsFilter>(EMPTY_ARCHIVE_FILTER);
  const [archivedRange, setArchivedRange] = useState<ArchivedRangePreset | null>("48h");
  const [appliedArchivedFilter, setAppliedArchivedFilter] = useState<ArchivedJobsFilter>(EMPTY_ARCHIVE_FILTER);
  // Once the archive filter is applied, only archived jobs are shown (live jobs
  // are not fetched) until the filter is cleared or archived jobs are hidden
  const [archivedFilterApplied, setArchivedFilterApplied] = useState(false);
  const archivedOnly = showArchivedJobs && archivedFilterApplied;

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

  // With archived jobs shown, the merged list can't be paged per source:
  // fetch the first page * pageSize items of both, merge, then slice the page
  const myMergedFetchLimit = myJobsPage * jobsPageSize;

  // Fetch my jobs (filtered by current user's username)
  // Use owner filter to get only the current user's jobs
  const {
    data: myJobsData,
    isLoading: myJobsLoading,
    error: myJobsError,
  } = useJobs({
    page: showArchivedJobs ? 1 : myJobsPage,
    limit: showArchivedJobs ? myMergedFetchLimit : jobsPageSize,
    sort: myJobsSort,
    order: myJobsOrder,
    search: myJobsSearch.trim() || undefined,
    owner: currentUsername || undefined, // Filter by current user's username
    state: myStateFilter === 'all' ? undefined : myStateFilter,
    enabled: activeTab === "my" && !!currentUsername && !archivedOnly,
  });
  // A disabled query can still return cached data - ignore it in archived-only mode
  const liveMyJobsData = archivedOnly ? undefined : myJobsData;
  const liveMyJobsError = archivedOnly ? null : myJobsError;

  const {
    data: summaryData,
  } = useJobsSummary({
    enabled: activeTab === "waiting",
  });

  const {
    data: archivedData,
    isLoading: archivedIsLoading,
    error: archivedError,
  } = useArchivedJobs({
    page: 1,
    limit: myMergedFetchLimit,
    sort: myJobsSort,
    order: myJobsOrder,
    lastCount: undefined,
    range: archivedRange,
    search: myJobsSearch.trim() || undefined,
    username: currentUsername || undefined, // Admins would otherwise get all users' jobs
    filter: appliedArchivedFilter,
    enabled: showArchivedJobs && !!currentUsername,
  });


  // My jobs merged with archived jobs, mapped to the JobListDTO format
  const archivedJobs: JobListDTO[] =
    !archivedIsLoading && !archivedError && archivedData?.data?.jobs
      && (myStateFilter === "all" || myStateFilter === "Archived")
      ? archivedData.data.jobs.map((job) => ({
          id: job.id,
          name: job.name,
          state: "Archived",
          stateName: "archived",
          stateColor: "bg-amber-100 text-amber-800",
          owner: job.username ?? "",
          username: job.username ?? "",
          queue: job.queue,
          server: job.pbsServer,
          node: null,
          cpuReserved: job.cpus,
          gpuReserved: job.gpuReserved ?? 0,
          // Archive reports bytes, live jobs use fractional GB
          memoryReserved: job.memoryReserved != null ? job.memoryReserved / (1024 * 1024 * 1024) : 0,
          memoryUsed: job.memoryUsed != null ? job.memoryUsed / (1024 * 1024 * 1024) : null,
          memoryUsagePercent: job.memoryUsed != null && job.memoryReserved
            ? Math.min(100, Math.round((job.memoryUsed / job.memoryReserved ) * 100))
            : null,
          gpuUsagePercent: job.gpupercent,
          gpuUsagePercentPerGpu: job.gpupercent != null && job.gpuReserved
            ? Math.round( job.gpupercent / ( job.gpuReserved > 0 ?  job.gpuReserved : 1))
            : null,
          runtime: job.runtime ?? 0,
          walltimeReserved: job.walltime ?? 0,
          cpuUsagePercent: job.cpupercent != null ? Math.round(job.cpupercent) : null,
          cpuUsagePercentPerCpu: job.cpupercent != null && job.cpus
            ? Math.round(job.cpupercent / job.cpus)
            : null,
          createdAt: job.createdAt ?? 0,
          exitCode: job.exitStatus,
          cpuTimeUsed: null,
          gpuTimeUsed: null,
          estimStartTime: null,
          completedBy: null,
          comment: null,
          is_dependent: false, // Archived jobs don't have dependency info
          canSeeOwner: true,
        }))
      : [];

  // A job can be both live and archived - prefer the live one
  const liveMyJobIds = new Set(liveMyJobsData?.data?.jobs?.map((job) => job.id) ?? []);
  const uniqueArchivedJobs = archivedJobs.filter((job) => !liveMyJobIds.has(job.id));
  // Only duplicates within the fetched windows are known, the rest can't be detected
  const duplicateJobsCount = archivedJobs.length - uniqueArchivedJobs.length;

  const allMyData: JobsListResponse | undefined = liveMyJobsData || archivedOnly
    ? {
        meta: {
          ...liveMyJobsData?.meta,
          totalCount:
            (liveMyJobsData?.meta?.totalCount ?? 0) +
            (archivedJobs.length > 0
              ? (archivedData?.meta?.totalCount ?? 0) - duplicateJobsCount
              : 0),
          filterableStates: {
            ...liveMyJobsData?.meta?.filterableStates,
            ...(!archivedIsLoading && !archivedError && archivedData?.data?.jobs?.length
              ? { Archived: "archived" }
              : {}),
          },
        },
        data: {
          ...liveMyJobsData?.data,
          jobs: mergeSortedJobs(
            liveMyJobsData?.data?.jobs ?? [],
            uniqueArchivedJobs,
            myJobsSort,
            myJobsOrder
          ).slice((myJobsPage - 1) * jobsPageSize, myMergedFetchLimit),
        },
      }
    : undefined;

  const myMergedJobsData = showArchivedJobs ? allMyData : myJobsData;

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

  // Applying the form filter drops the range preset until a range button is pressed again
  const handleApplyArchivedFilter = () => {
    setAppliedArchivedFilter(archivedFilter);
    setArchivedFilterApplied(true);
    setArchivedRange(null);
    setMyJobsPage(1);
  };

  // A range preset replaces the applied form filter - the form fields keep their
  // values but are ignored until applied again
  const handleArchivedRangeChange = (range: ArchivedRangePreset) => {
    setArchivedRange(range);
    setAppliedArchivedFilter(EMPTY_ARCHIVE_FILTER);
    setArchivedFilterApplied(false);
    setMyJobsPage(1);
  };

  const handleClearArchivedFilter = () => {
    setArchivedFilter(EMPTY_ARCHIVE_FILTER);
    setAppliedArchivedFilter(EMPTY_ARCHIVE_FILTER);
    setArchivedFilterApplied(false);
    setArchivedRange("48h");
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

  const myJobsTotalPages = myMergedJobsData?.meta?.totalCount
    ? Math.ceil(myMergedJobsData.meta.totalCount / jobsPageSize)
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
            totalJobs={myMergedJobsData?.meta?.totalCount || 0}
            lastRunningCompletedBy={myMergedJobsData?.meta?.lastRunningCompletedBy || null}
            extraControls={
              <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchivedJobs}
                  onChange={(e) => {
                    setShowArchivedJobs(e.target.checked);
                    if (!e.target.checked) setArchivedFilterApplied(false);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {t("jobsArchive.showJobs")}
              </label>
            }
          />

          {showArchivedJobs && (
            <ArchivedJobsFilterSection
              filter={archivedFilter}
              onFilterChange={setArchivedFilter}
              range={archivedRange}
              onRangeChange={handleArchivedRangeChange}
              onApply={handleApplyArchivedFilter}
              onClear={handleClearArchivedFilter}
              className="mb-4"
            />
          )}

          {(myJobsLoading || showArchivedJobs && archivedIsLoading)&& (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}

          {(liveMyJobsError || showArchivedJobs && archivedError)&& (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {liveMyJobsError instanceof Error
                  ? liveMyJobsError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}

          {!myJobsLoading && !archivedIsLoading && myMergedJobsData && myMergedJobsData.data && (
            <>
              <JobsTable
                jobs={myMergedJobsData.data.jobs}
                sortColumn={myJobsSort}
                sortDirection={myJobsOrder}
                onSort={handleMyJobsSort}
                hideUserColumn={true}
                filterableStates={myMergedJobsData.meta?.filterableStates || null}
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
