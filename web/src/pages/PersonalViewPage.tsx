import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useJobs } from "@/hooks/useJobs";
import { useProjects } from "@/hooks/useProjects";
import { JobsTable } from "@/components/jobs/JobsTable";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { Pagination } from "@/components/common/Pagination";
import { JobsSearchBar } from "@/components/jobs/JobsSearchBar";
import { ProjectsSearchBar } from "@/components/projects/ProjectsSearchBar";
import type {
  SortColumn as ProjectsSortColumn,
  Project,
} from "@/components/projects/types";
import type { JobFilterableState } from "@/components/jobs/JobsFilterableHeader";

type JobsSortColumnType =
  | "id"
  | "name"
  | "state"
  | "owner"
  | "node"
  | "cpuReserved"
  | "gpuReserved"
  | "memoryReserved"
  | "createdAt";

export function PersonalViewPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const username = currentUser?.username?.split("@")[0] || "";

  // Jobs state
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsLimit] = useState(20);
  const [jobsSort, setJobsSort] = useState<JobsSortColumnType>("createdAt");
  const [jobsOrder, setJobsOrder] = useState<"asc" | "desc">("desc");
  const [jobsSearch, setJobsSearch] = useState("");
  const [debouncedJobsSearch, setDebouncedJobsSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<JobFilterableState>("all");

  // Projects state
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsLimit] = useState(20);
  const [projectsSort, setProjectsSort] =
    useState<ProjectsSortColumn>("status");
  const [projectsOrder, setProjectsOrder] = useState<"asc" | "desc">("asc");
  const [projectsSearch, setProjectsSearch] = useState("");
  const [debouncedProjectsSearch, setDebouncedProjectsSearch] = useState("");

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJobsSearch(jobsSearch);
      setJobsPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [jobsSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProjectsSearch(projectsSearch);
      setProjectsPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [projectsSearch]);

  // Fetch all user's jobs for statistics (all states, no pagination)
  const { data: allUserJobsData } = useJobs({
    owner: username,
    limit: 10000, // Get all user's jobs for statistics
    enabled: !!username,
  });

  // Fetch user's jobs for the table (paginated)
  const {
    data: userJobsData,
    isLoading: userJobsLoading,
    error: userJobsError,
  } = useJobs({
    page: jobsPage,
    limit: jobsLimit,
    sort: jobsSort,
    order: jobsOrder,
    search: debouncedJobsSearch.trim() || undefined,
    owner: username,
    state: stateFilter === "all" ? undefined : stateFilter,
    enabled: !!username,
  });

  // Fetch all projects (we'll filter to user's projects on the client side)
  // Use a high limit to get all projects, then filter and paginate client-side
  const {
    data: userProjectsData,
    isLoading: userProjectsLoading,
    error: userProjectsError,
  } = useProjects({
    page: 1,
    limit: 10000, // Fetch all projects, then filter client-side
    enabled: !!username,
  });

  // Calculate user's job statistics by state
  const userStatistics = useMemo(() => {
    if (!allUserJobsData?.data?.jobs) {
      return {
        tasks: {
          queued: 0,
          running: 0,
          done: 0,
          total: 0,
        },
        cpu: {
          queued: 0,
          running: 0,
          done: 0,
          total: 0,
        },
        gpu: {
          queued: 0,
          running: 0,
          done: 0,
          total: 0,
        },
      };
    }

    const jobs = allUserJobsData.data.jobs;
    const stats = {
      tasks: {
        queued: 0,
        running: 0,
        done: 0,
        total: jobs.length,
      },
      cpu: {
        queued: 0,
        running: 0,
        done: 0,
        total: 0,
      },
      gpu: {
        queued: 0,
        running: 0,
        done: 0,
        total: 0,
      },
    };

    for (const job of jobs) {
      const state = job.state?.toUpperCase() || "";
      const cpuReserved = job.cpuReserved || 0;
      const gpuReserved = job.gpuReserved || 0;

      // Categorize by state
      if (state === "Q") {
        // Queued
        stats.tasks.queued++;
        stats.cpu.queued += cpuReserved;
        stats.gpu.queued += gpuReserved;
      } else if (state === "R") {
        // Running
        stats.tasks.running++;
        stats.cpu.running += cpuReserved;
        stats.gpu.running += gpuReserved;
      } else if (
        state === "C" ||
        state === "F" ||
        state === "X" ||
        state === "E" ||
        state === "B"
      ) {
        // Done (Completed, Finished, Exited, Exiting, Begun)
        stats.tasks.done++;
        stats.cpu.done += cpuReserved;
        stats.gpu.done += gpuReserved;
      }

      // Add to totals
      stats.cpu.total += cpuReserved;
      stats.gpu.total += gpuReserved;
    }

    return stats;
  }, [allUserJobsData]);

  const handleJobsSort = (column: JobsSortColumnType) => {
    if (jobsSort === column) {
      setJobsOrder(jobsOrder === "asc" ? "desc" : "asc");
    } else {
      setJobsSort(column);
      setJobsOrder("desc");
    }
    setJobsPage(1);
  };

  const handleStateFilterChange = (state: JobFilterableState) => {
    setStateFilter(state);
    setJobsPage(1);
  };

  const handleJobsPageChange = (newPage: number) => {
    setJobsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJobsSearchChange = (query: string) => {
    setJobsSearch(query);
  };

  const handleProjectsSort = (column: ProjectsSortColumn) => {
    if (projectsSort === column) {
      setProjectsOrder(projectsOrder === "asc" ? "desc" : "asc");
    } else {
      const defaultOrder =
        column === "vmCount" ||
        column === "vcpus" ||
        column === "memoryGb"
          ? "desc"
          : "asc";
      setProjectsSort(column);
      setProjectsOrder(defaultOrder);
    }
    setProjectsPage(1);
  };

  const handleProjectsPageChange = (newPage: number) => {
    setProjectsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProjectsSearchChange = (query: string) => {
    setProjectsSearch(query);
  };

  const userJobsTotalCount =
    userJobsData && typeof userJobsData === "object" && "meta" in userJobsData
      ? (userJobsData.meta as { totalCount?: number })?.totalCount || 0
      : 0;
  const userJobsTotalPages = userJobsTotalCount
    ? Math.ceil(userJobsTotalCount / jobsLimit)
    : 0;
  const userJobs =
    userJobsData && typeof userJobsData === "object" && "data" in userJobsData
      ? (userJobsData.data as { jobs?: any[] })?.jobs || []
      : [];

  // Filter to only show user's projects (isPersonal or isMyProject)
  // This ensures even admins only see their own projects on this page
  const allProjects: Project[] =
    userProjectsData &&
    typeof userProjectsData === "object" &&
    "data" in userProjectsData
      ? (userProjectsData.data as { projects?: Project[] })?.projects || []
      : [];

  const userProjects = useMemo(() => {
    return allProjects.filter(
      (project) => project.isPersonal || project.isMyProject
    );
  }, [allProjects]);

  // Apply sorting to filtered projects
  const sortedProjects = useMemo(() => {
    const sorted = [...userProjects];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (projectsSort) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "vmCount":
          aValue = a.reservedResources.vmCount;
          bValue = b.reservedResources.vmCount;
          break;
        case "vcpus":
          aValue = a.reservedResources.vcpus;
          bValue = b.reservedResources.vcpus;
          break;
        case "memoryGb":
          aValue = a.reservedResources.memoryGb;
          bValue = b.reservedResources.memoryGb;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return projectsOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return projectsOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [userProjects, projectsSort, projectsOrder]);

  // Apply search filter to sorted projects
  const filteredProjects = useMemo(() => {
    if (!debouncedProjectsSearch.trim()) {
      return sortedProjects;
    }
    const searchLower = debouncedProjectsSearch.toLowerCase().trim();
    return sortedProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) ||
        project.id.toLowerCase().includes(searchLower)
    );
  }, [sortedProjects, debouncedProjectsSearch]);

  // Apply pagination
  const startIndex = (projectsPage - 1) * projectsLimit;
  const endIndex = startIndex + projectsLimit;
  const projects = filteredProjects.slice(startIndex, endIndex);

  // Update total count to reflect filtered results
  const finalProjectsTotalCount = filteredProjects.length;
  const finalProjectsTotalPages = finalProjectsTotalCount
    ? Math.ceil(finalProjectsTotalCount / projectsLimit)
    : 0;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.personalView")}
          </h1>
        </div>
      </header>
      <div className="p-6 space-y-6">
        {/* User Statistics Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t("personalView.myStatistics")}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Tasks Section */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("personalView.totalTasks")}
                </h3>
                <Icon
                  icon="solar:document-bold"
                  className="w-6 h-6 text-gray-600"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t("queues.queued")}
                  </span>
                  <span className="text-base font-semibold text-blue-600">
                    {userStatistics.tasks.queued}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t("queues.running")}
                  </span>
                  <span className="text-base font-semibold text-blue-600">
                    {userStatistics.tasks.running}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t("queues.done")}
                  </span>
                  <span className="text-base font-semibold text-green-600">
                    {userStatistics.tasks.done}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                  <span className="text-sm font-medium text-gray-900">
                    {t("queues.total")}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {userStatistics.tasks.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Resource Utilization Section */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("personalView.resourceUtilization")}
                </h3>
                <Icon
                  icon="solar:chart-bold"
                  className="w-6 h-6 text-gray-600"
                />
              </div>
              <div className="space-y-4">
                {/* CPU Section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      icon="solar:cpu-bold"
                      className="w-5 h-5 text-green-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      CPU:
                    </span>
                  </div>
                  <div className="ml-7 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {t("queues.queued")}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        {userStatistics.cpu.queued}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {t("queues.running")}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        {userStatistics.cpu.running}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {t("queues.done")}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {userStatistics.cpu.done}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-300">
                      <span className="text-xs font-medium text-gray-700">
                        {t("queues.total")}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {userStatistics.cpu.total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GPU Section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      icon="solar:gpu-bold"
                      className="w-5 h-5 text-purple-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      GPU:
                    </span>
                  </div>
                  {userStatistics.gpu.total === 0 ? (
                    <div className="ml-7">
                      <span className="text-xs text-gray-400 italic">
                        {t("personalView.noGpuResources")}
                      </span>
                    </div>
                  ) : (
                    <div className="ml-7 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          {t("queues.queued")}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {userStatistics.gpu.queued}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          {t("queues.running")}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {userStatistics.gpu.running}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          {t("queues.done")}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {userStatistics.gpu.done}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-300">
                        <span className="text-xs font-medium text-gray-700">
                          {t("queues.total")}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {userStatistics.gpu.total}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My PBS Jobs Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t("personalView.myPbsJobs")}
          </h2>
          <JobsSearchBar
            searchQuery={jobsSearch}
            onSearchChange={handleJobsSearchChange}
            totalJobs={userJobsTotalCount}
          />
          {userJobsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}
          {userJobsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {userJobsError instanceof Error
                  ? userJobsError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}
          {userJobsData && (
            <>
              <JobsTable
                jobs={userJobs}
                sortColumn={jobsSort}
                sortDirection={jobsOrder}
                onSort={handleJobsSort}
                hideUserColumn={true}
                stateFilter={stateFilter}
                onStateFilterChange={handleStateFilterChange}
              />
              <Pagination
                currentPage={jobsPage}
                totalPages={userJobsTotalPages}
                onPageChange={handleJobsPageChange}
              />
            </>
          )}
        </div>

        {/* My Cloud Projects Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t("personalView.myCloudProjects")}
          </h2>
          <ProjectsSearchBar
            searchQuery={projectsSearch}
            onSearchChange={handleProjectsSearchChange}
            totalProjects={finalProjectsTotalCount}
          />
          {userProjectsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          )}
          {userProjectsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-800">
                {t("common.errorLoading")}{" "}
                {userProjectsError instanceof Error
                  ? userProjectsError.message
                  : t("common.unknownError")}
              </div>
            </div>
          )}
          {userProjectsData && (
            <>
              <ProjectsTable
                projects={projects}
                sortColumn={projectsSort}
                sortDirection={projectsOrder}
                onSort={handleProjectsSort}
              />
              <Pagination
                currentPage={projectsPage}
                totalPages={finalProjectsTotalPages}
                onPageChange={handleProjectsPageChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
