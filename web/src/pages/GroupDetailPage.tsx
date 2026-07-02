import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useGroupDetail } from "@/hooks/useGroups";

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { groupName } = useParams<{ groupName: string }>();
  const decodedGroupName = groupName ? decodeURIComponent(groupName) : "";
  const {
    data: groupDetail,
    isLoading,
    error,
  } = useGroupDetail(decodedGroupName);
  const data = groupDetail?.data;
  const navigate = useNavigate();

  const handleUserClick = (user: string) => {
    navigate(`/users/${encodeURIComponent(user)}`);
  };

  if (isLoading) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {t("pages.groupDetail")}
            </h1>
          </div>
        </header>
        <div className="p-4 sm:p-6">
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
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {t("pages.groupDetail")}
            </h1>
          </div>
        </header>
        <div className="p-4 sm:p-6">
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
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
              {t("pages.groupDetail")}
            </h1>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <div className="text-center text-gray-500 py-12">
            {t("groups.groupNotFound")}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.groupDetail")}
          </h1>
        </div>
      </header>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Group Info Section */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("groups.name")}</div>
                <div className="text-lg font-semibold text-gray-900 break-words">
                  {data.name}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("groups.gid")}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {data.gid}
                </div>
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div className="px-4 sm:px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("groups.members")} ({data.members.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("groups.nickname")}
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("groups.name")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.members.map((member) => (
                    <tr
                      key={member.nickname}
                      onClick={() => handleUserClick(member.nickname)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-normal sm:whitespace-nowrap text-sm font-medium text-gray-900 break-words">
                        {member.nickname}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-normal sm:whitespace-nowrap text-sm text-gray-500 break-words">
                        {member.name
                          ? typeof member.name === "string"
                            ? member.name
                            : member.name.name
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
