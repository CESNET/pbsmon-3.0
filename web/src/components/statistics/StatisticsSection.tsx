import type { FormEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { GraphAction } from "./types";

const primaryButtonClass =
  "px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClass =
  "px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

/** Card with a title, description, form body and action buttons */
export function StatisticsSection({
  title,
  description,
  warning,
  children,
  onAction,
  onReset,
  isBusy = false,
}: {
  title: string;
  description: string | string[];
  warning?: string;
  children: ReactNode;
  onAction: (action: GraphAction) => void;
  onReset?: () => void;
  /** Disables the action buttons while data is being loaded */
  isBusy?: boolean;
}) {
  const { t } = useTranslation();
  const paragraphs = Array.isArray(description) ? description : [description];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Both buttons submit the form (so native validation applies),
    // the clicked one tells which action to run
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const action =
      submitter instanceof HTMLButtonElement && submitter.value === "download"
        ? "download"
        : "show";
    onAction(action);
  };
  const handleReset = (e: FormEvent) => {
    e.preventDefault();
    onReset?.();
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit} onReset={handleReset}>
        <div className="px-4 sm:px-6 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-primary-900">{title}</h2>
          <div className="mt-1 text-sm text-gray-600 space-y-0.5">
            {paragraphs.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
            {warning && <p className="text-orange-700">{warning}</p>}
          </div>
        </div>
        <div className="px-4 sm:px-6 py-4 space-y-4">{children}</div>
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex gap-2">
          <button
            type="submit"
            value="show"
            disabled={isBusy}
            className={primaryButtonClass}
          >
            {t("statistics.showGraph")}
          </button>
          <button
            type="submit"
            value="download"
            disabled={isBusy}
            className={secondaryButtonClass}
          >
            {t("statistics.downloadData")}
          </button>
          {onReset && (
            <button type="reset" className={secondaryButtonClass}>
              {t("statistics.reset")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
