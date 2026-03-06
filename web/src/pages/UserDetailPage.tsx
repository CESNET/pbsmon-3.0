import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useUserDetail } from "@/hooks/useUserDetail";
import { useUserAccounting } from "@/hooks/useUserAccounting";
import { useJobs } from "@/hooks/useJobs";
import { useQueues } from "@/hooks/useQueues";
import { Tabs } from "@/components/common/Tabs";
import { UserBasicInfo } from "@/components/users/UserBasicInfo";
import { UserFairshareSection } from "@/components/users/UserFairshareSection";
import { UserAccountingSection } from "@/components/users/UserAccountingSection";
import { UserJobsTab } from "@/components/users/UserJobsTab";
import { UserQueuesTab } from "@/components/users/UserQueuesTab";
import type { JobFilterableState } from "@/components/jobs/JobsFilterableHeader";

type SortColumn =
  | "id"
  | "name"
  | "state"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

export function UserDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading, error } = useUserDetail(userId || "");

  // Fetch accounting data
  const {
    data: accountingData,
    isLoading: accountingLoading,
    error: accountingError,
  } = useUserAccounting(userId || "");

  // Tab state
  const [activeTab, setActiveTab] = useState("jobs");

  // Jobs tab state
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsLimit] = useState(20);
  const [jobsSort, setJobsSort] = useState<SortColumn>("createdAt");
  const [jobsOrder, setJobsOrder] = useState<"asc" | "desc">("desc");
  const [jobsSearch, setJobsSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<JobFilterableState>("all");

  // Fetch jobs filtered by user
  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
  } = useJobs({
    page: jobsPage,
    limit: jobsLimit,
    sort: jobsSort,
    order: jobsOrder,
    search: userId || undefined, // Filter by username
    state: stateFilter === "all" ? undefined : stateFilter,
    enabled: activeTab === "jobs" && !!userId,
  });

  // Fetch queues filtered by the viewed user (backend returns only queues the user has access to)
  const {
    data: queuesData,
    isLoading: queuesLoading,
    error: queuesError,
  } = useQueues({
    user: userId || undefined,
    enabled: activeTab === "queues" && !!userId,
  });

  const handleJobsSort = (column: SortColumn) => {
    if (jobsSort === column) {
      setJobsOrder(jobsOrder === "asc" ? "desc" : "asc");
    } else {
      setJobsSort(column);
      setJobsOrder("desc");
    }
    setJobsPage(1);
  };

  const handleJobsPageChange = (newPage: number) => {
    setJobsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJobsSearchChange = (query: string) => {
    setJobsSearch(query);
    setJobsPage(1);
  };

  const handleStateFilterChange = (state: JobFilterableState) => {
    setStateFilter(state);
    setJobsPage(1);
  }

  if (isLoading) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">
              {t("pages.userDetail")}
            </h1>
          </div>
        </header>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("common.loading")}</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">
              {t("pages.userDetail")}
            </h1>
          </div>
        </header>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              {t("common.errorLoading")}{" "}
              {error instanceof Error
                ? error.message
                : t("common.unknownError")}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">
              {t("pages.userDetail")}
            </h1>
          </div>
        </header>
        <div className="p-6">
          <div className="text-center text-gray-500 py-12">
            {t("users.userNotFound")}
          </div>
        </div>
      </>
    );
  }

  const tabs = [
    {
      id: "jobs",
      label: t("users.tabs.jobs"),
      content: (
        <UserJobsTab
          jobsData={jobsData}
          isLoading={jobsLoading}
          error={jobsError}
          jobsPage={jobsPage}
          jobsLimit={jobsLimit}
          jobsSort={jobsSort}
          jobsOrder={jobsOrder}
          jobsSearch={jobsSearch}
          stateFilter={stateFilter}
          onSort={handleJobsSort}
          onPageChange={handleJobsPageChange}
          onSearchChange={handleJobsSearchChange}
          onStateFilterChange={handleStateFilterChange}
        />
      ),
    },
    {
      id: "queues",
      label: t("users.tabs.queues"),
      content: (
        <UserQueuesTab
          queues={queuesData?.queues || []}
          isLoading={queuesLoading}
          error={queuesError}
        />
      ),
    },
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.userDetail")}
          </h1>
        </div>
      </header>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <UserBasicInfo user={data} />
          <UserFairshareSection fairsharePerServer={data.fairsharePerServer} />
          <UserAccountingSection
            accountingData={accountingData || null}
            isLoading={accountingLoading}
            error={accountingError as Error | null}
          />
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      </div>
    </>
  );
}
