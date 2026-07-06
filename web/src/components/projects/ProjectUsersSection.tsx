import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ProjectUserDTO } from "@/lib/generated-api";

interface ProjectUsersSectionProps {
  users: ProjectUserDTO[];
}

export function ProjectUsersSection({ users }: ProjectUsersSectionProps) {
  const { t } = useTranslation();

  // Compact view covers narrow-width phones (portrait) as well as short-height
  // phones in landscape, where a width-only breakpoint would otherwise show
  // the full desktop column set on a screen too short to comfortably use it.
  const isCompact = useMediaQuery(
    "(max-width: 639px), (max-height: 500px) and (orientation: landscape)"
  );

  if (users.length === 0) {
    return (
      <div className="px-6 py-4 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("projects.users")}
        </h2>
        <div className="text-center text-gray-500 py-8">
          <Icon
            icon="mdi:account-off"
            className="w-12 h-12 mx-auto mb-2 text-gray-400"
          />
          <p>{t("projects.noUsers")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("projects.users")} ({users.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {!isCompact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("projects.userName")}
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("projects.userLogname")}
              </th>
              {!isCompact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("projects.userOrg")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user, index) => {
              const isFoundInPerun = user.foundInPerun !== false;
              const tooltipId = `user-not-found-${index}`;
              const fullName = typeof user.fullName === "string"
                ? user.fullName
                : (user.fullName ? String(user.fullName) : null);
              const orgString =
                typeof user.org === "string"
                  ? user.org
                  : user.org === null
                    ? null
                    : String(user.org);
              const idString =
                typeof user.id === "string"
                  ? user.id
                  : user.id === null
                    ? null
                    : String(user.id);
              const nameString =
                typeof user.name === "string" ? user.name : String(user.name);
              const lognameString =
                typeof user.logname === "string"
                  ? user.logname
                  : String(user.logname);

              const userKey = lognameString || idString || index;

              return (
                <tr
                  key={userKey}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isFoundInPerun ? (
                      <Link
                        to={`/users/${encodeURIComponent(lognameString)}`}
                        className="flex items-center text-sm font-medium text-primary-700 hover:text-primary-900"
                      >
                        <Icon
                          icon="mdi:account"
                          className="w-5 h-5 text-gray-400 mr-2"
                        />
                        <span>{fullName || nameString}</span>
                      </Link>
                    ) : (
                      <>
                        <div
                          className="flex items-center text-sm font-medium text-gray-600"
                          data-tooltip-id={tooltipId}
                          data-tooltip-content={t(
                            "projects.userNotFoundInPerun"
                          )}
                        >
                          <Icon
                            icon="mdi:account-alert"
                            className="w-5 h-5 text-gray-400 mr-2"
                          />
                          <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {fullName || idString || nameString}
                          </code>
                        </div>
                        <Tooltip
                          id={tooltipId}
                          style={{ maxWidth: "300px", whiteSpace: "normal" }}
                        />
                      </>
                    )}
                  </td>
                  {!isCompact && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code
                        title={lognameString || undefined}
                        className="inline-block max-w-[10rem] sm:max-w-xs align-bottom truncate text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                      >
                        {lognameString || "-"}
                      </code>
                    </td>
                  )}
                  {!isCompact && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {orgString || "-"}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
