import { useTranslation } from "react-i18next";
import { canReadStatistics, useCurrentUser } from "@/hooks/useCurrentUser";
import { useStatisticsAccess } from "@/hooks/useStatistics";
import { ApiError } from "@/lib/generated-api/core/ApiError";
import { StatisticsGraph } from "@/components/statistics/StatisticsGraph";
import { useStatisticsGraphDefinitions } from "@/components/statistics/useStatisticsGraphDefinitions";

export function StatisticsPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const roleAllowed = canReadStatistics(currentUser?.role);
  // The backend decides the access (e.g. statistics users need configured clusters)
  const accessQuery = useStatisticsAccess(roleAllowed);
  const access = accessQuery.data;
  const graphs = useStatisticsGraphDefinitions(access !== undefined, access);

  const denied =
    !roleAllowed ||
    (accessQuery.error instanceof ApiError && accessQuery.error.status === 403);

  let content;
  if (denied) {
    content = (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {t("statistics.accessDenied")}
      </div>
    );
  } else if (accessQuery.error) {
    content = (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {t("statistics.loadError")} {accessQuery.error.message}
      </div>
    );
  } else if (!access) {
    content = (
      <div className="text-sm text-gray-600">{t("common.loading")}</div>
    );
  } else {
    content = (
      <>
        {(access.clusters || access.organizations) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-1">
            {access.clusters && (
              <p>
                {t("statistics.limitedClusters", {
                  clusters: access.clusters.join(", "),
                })}
              </p>
            )}
            {access.organizations && (
              <p>
                {access.organizations.length > 0
                  ? t("statistics.limitedOrganizations", {
                      organizations: access.organizations.join(", "),
                    })
                  : t("statistics.noOrganizations")}
              </p>
            )}
          </div>
        )}
        {graphs.map((graph) => (
          <StatisticsGraph key={graph.id} definition={graph} />
        ))}
      </>
    );
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
          {t("pages.statistics")}
        </h1>
      </header>
      <div className="p-4 sm:p-6 space-y-6">{content}</div>
    </>
  );
}
