import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProjects } from "@/hooks/useProjects";
import { Pagination } from "@/components/common/Pagination";
import { ProjectsSearchBar } from "@/components/projects/ProjectsSearchBar";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import type { SortColumn, Project } from "@/components/projects/types";

export function ProjectsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sort, setSort] = useState<SortColumn>("status");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input - update debouncedSearch after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useProjects({
    page,
    limit,
    sort,
    order,
    search: debouncedSearch.trim() || undefined,
  });

  const handleSort = (column: SortColumn) => {
    if (sort === column) {
      // Toggle order if same column
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default order
      // Default to desc for numeric fields, asc for text fields
      const defaultOrder =
        column === "vmCount" || column === "vcpus" || column === "memoryGb"
          ? "desc"
          : "asc";
      setSort(column);
      setOrder(defaultOrder);
    }
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (query: string) => {
    setSearch(query);
    // Don't reset page here - let the debounce effect handle it
  };

  const totalCount =
    data && typeof data === "object" && "meta" in data
      ? (data.meta as { totalCount?: number })?.totalCount || 0
      : 0;
  const totalPages = totalCount ? Math.ceil(totalCount / limit) : 0;

  const projects: Project[] = data?.data?.projects || [];

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
            {t("pages.projects")}
          </h1>
        </div>
      </header>
      <div className="p-4 sm:p-6">
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

        {data && (
          <>
            <ProjectsSearchBar
              searchQuery={search}
              onSearchChange={handleSearchChange}
              totalProjects={totalCount}
            />

            <ProjectsTable
              projects={projects}
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
