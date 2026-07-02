import { useTranslation } from "react-i18next";
import type { UserFairshareDTO } from "@/lib/generated-api";

interface UserFairshareSectionProps {
  fairsharePerServer: UserFairshareDTO[];
}

export function UserFairshareSection({
  fairsharePerServer,
}: UserFairshareSectionProps) {
  const { t } = useTranslation();

  const getRankingIcon = (
    ranking: number | null | undefined,
    totalUsers: number | null | undefined
  ) => {
    if (
      ranking === null ||
      ranking === undefined ||
      totalUsers === null ||
      totalUsers === undefined
    ) {
      return null;
    }

    // Ranking 1 = worst, ranking max (totalUsers) = best
    // Calculate position from top: worst position = totalUsers, best position = 1
    const positionFromTop = totalUsers - ranking + 1;

    // Top 10% or top 10 users (whichever is smaller) = green
    // Next 40% or next 40 users = yellow
    // Rest = red
    const top10Count = Math.min(10, Math.max(1, Math.floor(totalUsers * 0.1)));
    const top50Count = Math.min(50, Math.max(1, Math.floor(totalUsers * 0.5)));

    if (positionFromTop <= top10Count) {
      // Best users - green
      return (
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    } else if (positionFromTop <= top50Count) {
      // Middle users - yellow
      return (
        <svg
          className="w-4 h-4 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    } else {
      // Worst users - red
      return (
        <svg
          className="w-4 h-4 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
  };

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("users.fairsharePerServer")}
        </h2>
        <div className="relative group">
          <svg
            className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-normal w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {t("fairshare.infoTooltip")}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
      {fairsharePerServer.length === 0 ? (
        <div className="text-gray-500">{t("users.noFairshareData")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("users.server")}
                </th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("users.fairsharePriority")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fairsharePerServer.map((item) => {
                // Handle ranking - it might be number or Record<string, any> from generated types
                const rankingValue =
                  typeof item.ranking === "number"
                    ? item.ranking
                    : item.ranking !== null
                      ? Number(item.ranking)
                      : null;

                // totalUsers will be available after API client regeneration
                const totalUsers =
                  typeof (item as any).totalUsers === "number"
                    ? (item as any).totalUsers
                    : (item as any).totalUsers !== null &&
                        (item as any).totalUsers !== undefined
                      ? Number((item as any).totalUsers)
                      : null;

                // Calculate users before: ranking 1 (worst) = totalUsers - 1 users before
                // ranking max (best) = 0 users before
                // Formula: usersBefore = totalUsers - ranking
                const usersBefore =
                  rankingValue !== null &&
                  rankingValue !== undefined &&
                  !isNaN(rankingValue) &&
                  totalUsers !== null &&
                  totalUsers !== undefined &&
                  !isNaN(totalUsers)
                    ? totalUsers - rankingValue
                    : null;

                return (
                  <tr key={item.server} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-normal sm:whitespace-nowrap break-words text-sm font-medium text-gray-900">
                      {item.server}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-normal sm:whitespace-nowrap text-sm text-gray-600">
                      {usersBefore !== null ? (
                        <div className="flex items-center gap-2">
                          {getRankingIcon(rankingValue, totalUsers)}
                          <span>
                            {usersBefore === 0
                              ? t("users.noUsersBeforeYou")
                              : t("users.usersBeforeYou", {
                                  count: usersBefore,
                                })}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
