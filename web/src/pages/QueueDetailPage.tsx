import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQueueDetail } from "@/hooks/useQueueDetail";
import { QueueDetailContent } from "@/components/queues/QueueDetailContent";

export function QueueDetailPage() {
  const { t } = useTranslation();
  const { queueId } = useParams<{ queueId: string }>();
  const { data, isLoading, error } = useQueueDetail(queueId || "");

  // Set browser tab title to queue
  useEffect(() => {
    if (queueId) {
      document.title = queueId;
    }

    return () => {
      document.title = 'MetaCentrum';
    };
  }, [queueId]);

  if (isLoading) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">
              {t("pages.queueDetail")}
            </h1>
          </div>
        </header>
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
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">
              {t("pages.queueDetail")}
            </h1>
          </div>
        </header>
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

  if (!data || !data.data) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">
              {t("pages.queueDetail")}
            </h1>
          </div>
        </header>
        <div className="p-6">
          <div className="text-center text-gray-500 py-12">
            {t("queues.queueNotFound")}
          </div>
        </div>
      </>
    );
  }

  const queueDisplayName = data.data.server
    ? `${data.data.name}@${data.data.server}.metacentrum.cz`
    : data.data.name;

  const isInvalidReservation = !!data.data.reservation?.invalid;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-900">
            {t("pages.queueDetail")}:{" "}
            <span className={isInvalidReservation ? "text-red-600" : undefined}>
              {isInvalidReservation && "! "}
              {queueDisplayName}
            </span>
          </h1>
        </div>
      </header>
      {isInvalidReservation && (
        <div className="px-6 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 font-medium">
            {t("queues.invalidReservation")}
          </div>
        </div>
      )}
      <QueueDetailContent queue={data.data} queueId={queueId || ""} />
    </>
  );
}
