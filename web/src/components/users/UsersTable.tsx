import { useTranslation } from "react-i18next";
import type { UserListDTO } from "@/lib/generated-api";
import { UsersTableHeader } from "./UsersTableHeader";
import { UsersTableRow } from "./UsersTableRow";
import type { SortColumn } from "./types";

interface UsersTableProps {
  users: UserListDTO[];
  fairshareServers: string[];
  maxFairshare: Record<string, number>;
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  isAdmin: boolean;
  onImpersonate: (username: string) => void;
}

export function UsersTable({
  users,
  fairshareServers,
  maxFairshare,
  sortColumn,
  sortDirection,
  onSort,
  isAdmin,
  onImpersonate,
}: UsersTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
      <UsersTableHeader
        fairshareServers={fairshareServers}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={onSort}
        isAdmin={isAdmin}
      />

      {/* Table Body */}
      <div>
        {users.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            {t("users.noUsersFound")}
          </div>
        ) : (
          users.map((user) => (
            <UsersTableRow
              key={user.username}
              user={user}
              fairshareServers={fairshareServers}
              maxFairshare={maxFairshare}
              isAdmin={isAdmin}
              onImpersonate={onImpersonate}
            />
          ))
        )}
      </div>
    </div>
  );
}
