import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUsers } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { UsersSearchBar } from "@/components/users/UsersSearchBar";
import { UsersTable } from "@/components/users/UsersTable";
import { Pagination } from "@/components/common/Pagination";
import type { SortColumn } from "@/components/users/types";

export function UsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sort, setSort] = useState<string>("fairshare-pbs-m1");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  const { data: currentUser } = useCurrentUser();
  const { impersonate } = useImpersonation();
  const isAdmin = currentUser?.role === "admin";

  const { data, isLoading, error } = useUsers({
    page,
    limit,
    sort,
    order,
    search: search.trim() || undefined,
  });

  const handleSort = (column: SortColumn) => {
    if (sort === column) {
      // Toggle order if same column
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default order
      // Default to desc for fairshare, asc for others
      const defaultOrder = column.startsWith("fairshare-") ? "desc" : "asc";
      setSort(column);
      setOrder(defaultOrder);
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

  const handleImpersonate = (username: string) => {
    impersonate(username);
    // Redirect admin to personal view page after impersonation
    navigate("/personal-view");
  };

  // Get fairshare servers and maxFairshare from server response
  const fairshareServers = data?.data?.fairshareServers || [];
  const maxFairshare = data?.meta?.maxFairshare || {};

  const totalPages = data?.meta?.totalCount
    ? Math.ceil(data.meta.totalCount / limit)
    : 0;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
            {t("pages.users")}
          </h1>
        </div>
      </header>
      <div className="p-4 sm:p-6">
        <UsersSearchBar
          searchQuery={search}
          onSearchChange={handleSearchChange}
          totalUsers={data?.meta?.totalCount || 0}
        />

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
            <UsersTable
              users={data.data.users}
              fairshareServers={fairshareServers}
              maxFairshare={maxFairshare}
              sortColumn={sort as SortColumn}
              sortDirection={order}
              onSort={handleSort}
              isAdmin={isAdmin}
              onImpersonate={handleImpersonate}
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
