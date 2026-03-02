import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useQueueDetail } from "@/hooks/useQueueDetail";

interface NodeReservationProps {
  resvId: string;
}

export function NodeReservation({
  resvId,
}: NodeReservationProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQueueDetail(resvId?.split(".")[0] || "");

  if (isLoading) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              {t("machines.reservation")}
            </div>
          </div>
        </div>
        <div className="p-6">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              {t("machines.reservation")}
            </div>
          </div>
        </div>
        <div className="p-6">
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

  if (!data || !data.data || !data.data.reservation) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              {t("machines.reservation")}
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-12">
            {t("queues.reservationNotFound")}
          </div>
        </div>
      </>
    );
  }

  const reservation = data.data.reservation;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Icon
            icon={
              reservation.isStarted
                ? "mdi:calendar-clock"
                : "mdi:calendar-clock-outline"
            }
            className={`w-6 h-6 ${
              reservation.isStarted
                ? "text-purple-600"
                : "text-orange-600"
            }`}
          />
          <h2 className="text-lg font-semibold text-gray-900">
            {t("machines.reservation")}
          </h2>
          <div
            className={`px-3 py-1 text-xs font-medium rounded ${
              reservation.isStarted
                ? "bg-purple-100 text-purple-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {reservation.isStarted
              ? t("machines.reservationStarted")
              : t("machines.reservationNotStarted")}
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {reservation.displayName &&
              typeof reservation.displayName === "string" && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.reservationName")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {reservation.displayName}
                  </div>
                </div>
              )}
            {reservation.owner &&
              typeof reservation.owner === "string" && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.reservationOwner")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                      <Link
                        to={`/users/${encodeURIComponent(
                          (reservation.owner as string).split("@")[0]
                        )}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {(reservation.owner as string).split("@")[0]}
                      </Link>
                  </div>
                </div>
              )}
            {reservation.startTime &&
              typeof reservation.startTime === "number" && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.reservationStart")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {(() => {
                      const date = new Date(
                        reservation.startTime * 1000
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const year = date.getFullYear();
                      const hours = String(date.getHours()).padStart(
                        2,
                        "0"
                      );
                      const minutes = String(date.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      const seconds = String(date.getSeconds()).padStart(
                        2,
                        "0"
                      );
                      return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
                    })()}
                  </div>
                </div>
              )}
            {reservation.endTime &&
              typeof reservation.endTime === "number" && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t("machines.reservationEnd")}
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {(() => {
                      const date = new Date(
                        reservation.endTime * 1000
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const year = date.getFullYear();
                      const hours = String(date.getHours()).padStart(
                        2,
                        "0"
                      );
                      const minutes = String(date.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      const seconds = String(date.getSeconds()).padStart(
                        2,
                        "0"
                      );
                      return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
                    })()}
                  </div>
                </div>
              )}
          </div>
          {(reservation.resourceMem ||
            reservation.resourceNcpus ||
            reservation.resourceNgpus ||
            reservation.resourceNodect) && (
            <div>
              <div className="text-sm text-gray-500 mb-2">
                {t("machines.reservationResources")}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reservation.resourceMem &&
                  typeof reservation.resourceMem ===
                    "string" && (
                    <div>
                      <div className="text-xs text-gray-500">
                        {t("machines.memory")}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.resourceMem}
                      </div>
                    </div>
                  )}
                {reservation.resourceNcpus &&
                  typeof reservation.resourceNcpus ===
                    "string" && (
                    <div>
                      <div className="text-xs text-gray-500">
                        {t("machines.cpus")}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.resourceNcpus}
                      </div>
                    </div>
                  )}
                {reservation.resourceNgpus &&
                  typeof reservation.resourceNgpus ===
                    "string" && (
                    <div>
                      <div className="text-xs text-gray-500">
                        {t("machines.gpus")}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.resourceNgpus}
                      </div>
                    </div>
                  )}
                {reservation.resourceNodect &&
                  typeof reservation.resourceNodect ===
                    "string" && (
                    <div>
                      <div className="text-xs text-gray-500">
                        {t("machines.nodes")}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.resourceNodect}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
          {reservation.queue &&
            typeof reservation.queue === "string" && (
              <div>
                <div className="text-sm text-gray-500 mb-2">
                  {t("machines.reservationQueue")}
                </div>
                <div>
                  <Link
                    to={`/queues/${reservation.queue}${
                      (reservation.queue as string).includes("@")
                        ? ""
                        : reservation.name.replace(/^.*?\./, '@')
                    }`}
                    className="text-primary-600 hover:text-primary-800 font-medium"
                  >
                    {reservation.queue}
                  </Link>
                </div>
              </div>
            )}
          {reservation.authorizedUsers &&
            Array.isArray(reservation.authorizedUsers) &&
            reservation.authorizedUsers.length > 0 &&
            reservation.hasAccess === true && (
              <div>
                <div className="text-sm text-gray-500 mb-2">
                  {t("machines.reservationAuthorizedUsers")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {reservation.authorizedUsers.map(
                    (user: any, index: number) => {
                      // Handle both old format (string) and new format (object)
                      const username =
                        typeof user === "string"
                          ? user.split("@")[0]
                          : user.username;
                      const hasAccess =
                        typeof user === "string"
                          ? false
                          : user.hasAccess === true;
                      const key =
                        typeof user === "string"
                          ? user
                          : `${user.username}-${index}`;

                      if (hasAccess) {
                        return (
                          <Link
                            key={key}
                            to={`/users/${encodeURIComponent(username)}`}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 hover:text-primary-800"
                          >
                            {username}
                          </Link>
                        );
                      } else {
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md"
                          >
                            <Icon
                              icon="bxs:lock"
                              className="w-4 h-4 mr-1"
                            />
                            {username}
                          </span>
                        );
                      }
                    }
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
