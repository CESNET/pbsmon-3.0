import { useTranslation } from "react-i18next";
import type { JobMessageDTO } from "@/lib/generated-api";

interface JobMessagesSectionProps {
  messages: JobMessageDTO[];
}

export function JobMessagesSection({ messages }: JobMessagesSectionProps) {
  const { t } = useTranslation();

  if (messages.length === 0) {
    return null;
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "error":
        return (
          <svg
            className="w-5 h-5 text-red-600"
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
      case "warning":
        return (
          <svg
            className="w-5 h-5 text-yellow-600"
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
      case "info":
      default:
        return (
          <svg
            className="w-5 h-5 text-blue-600"
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
        );
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("jobs.messages")}
      </h2>
      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-4 rounded-lg border ${getMessageColor(
              message.type
            )}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getMessageIcon(message.type)}
            </div>
            <div className="flex-1 text-sm text-gray-900">
              {message.code && message.params
                ? String(t(`jobs.messageTypes.${message.code}`, message.params))
                : String(message.message)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
