import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { UserDetailDTO } from "@/lib/generated-api";

interface UserBasicInfoProps {
  user: UserDetailDTO;
}

export function UserBasicInfo({ user }: UserBasicInfoProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGroupDetail = (username: string) => {
    navigate(`/groups/${username}`);
  };

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("users.basicInfo")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">{t("users.username")}</div>
          <div className="text-lg font-medium text-gray-900 break-all">
            {user.username}
          </div>
        </div>
        {user.nickname && (
          <div>
            <div className="text-sm text-gray-500">{t("users.fullName")}</div>
            <div className="text-lg font-medium text-gray-900">
              {typeof user.nickname === "string"
                ? user.nickname
                : String(user.nickname)}
            </div>
          </div>
        )}
        {user.organization && (
          <div>
            <div className="text-sm text-gray-500">
              {t("users.organization")}
            </div>
            <div className="text-lg font-medium text-gray-900">
              {typeof user.organization === "string"
                ? user.organization
                : String(user.organization)}
            </div>
          </div>
        )}
        {user.membershipExpiration && (
          <div>
            <div className="text-sm text-gray-500">
              {t("users.membershipExpiration")}
            </div>
            <div className="text-lg font-medium text-gray-900">
              {(() => {
                const expiration = user.membershipExpiration;
                let date: Date | null = null;
                
                if (expiration instanceof Date) {
                  date = expiration;
                } else if (
                  typeof expiration === "string" ||
                  typeof expiration === "number"
                ) {
                  date = new Date(expiration);
                } else if (typeof expiration === "object" && expiration !== null) {
                  const dateValue = Object.values(expiration).find(
                    (v) => typeof v === "string" || typeof v === "number"
                  );
                  if (dateValue) {
                    date = new Date(dateValue as string | number);
                  }
                }
                
                if (!date || isNaN(date.getTime())) {
                  return String(expiration);
                }
                
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                return `${day}.${month}.${year}`;
              })()}
            </div>
          </div>
        )}
        {user.mail && (
          <div>
            <div className="text-sm text-gray-500">
              {t("users.mail")}
            </div>
            <div className="text-lg font-medium text-gray-900 break-all">
              {typeof user.mail === "string"
                ? user.mail
                : String(user.mail)}
            </div>
          </div>
        )}
        {user.lang && (
          <div>
            <div className="text-sm text-gray-500">
              {t("users.lang")}
            </div>
            <div className="text-lg font-medium text-gray-900">
              {typeof user.lang === "string"
                ? user.lang
                : String(user.lang)}
            </div>
          </div>
        )}
      </div>

      {/* Publications */}
      {user.publications && Object.keys(user.publications).length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-2">
            {t("users.publications")}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(user.publications).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {user.groups && user.groups.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-2">
            {t("users.groups")}
          </div>
          <div className="flex flex-wrap gap-2">
            { user.groups.map((group) => (
              <button
                onClick={() => handleGroupDetail(group)}
                className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded border border-primary-300 hover:border-primary-400"
              >
                { group }
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
