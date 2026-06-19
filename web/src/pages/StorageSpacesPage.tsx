import { useTranslation } from "react-i18next";
import { useStorageSpaces } from "@/hooks/useStorageSpaces";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserStorageQuotas } from "@/hooks/useUserStorageQuotas";
import { StorageSpacesContent } from "@/components/storage-spaces/StorageSpacesContent";

export function StorageSpacesPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useStorageSpaces();
  const { data: currentUser } = useCurrentUser();
  const username = currentUser?.username?.split("@")[0];
  const { data: quotasData } = useUserStorageQuotas(username);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.storageSpaces")}
          </h1>
        </div>
      </header>

      {isLoading && (
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("common.loading")}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              {t("common.errorLoading")}{" "}
              {error instanceof Error ? error.message : t("common.unknownError")}
            </div>
          </div>
        </div>
      )}

      {data && <StorageSpacesContent data={data} quotasData={quotasData ?? undefined} />}
    </>
  );
}
