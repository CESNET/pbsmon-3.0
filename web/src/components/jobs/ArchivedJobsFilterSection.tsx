import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import type { ArchivedJobsFilter, ArchivedRangePreset } from "@/hooks/useArchivedJobs";

export const EMPTY_ARCHIVE_FILTER: ArchivedJobsFilter = {
  job: "",
  name: "",
  queue: "",
  pbsServer: "",
  cpusFrom: "",
  cpusTo: "",
  gpusFrom: "",
  gpusTo: "",
  walltimeFrom: "",
  walltimeTo: "",
  runtimeFrom: "",
  runtimeTo: "",
  recordFrom: "",
  recordTo: "",
  createdFrom: "",
  createdTo: "",
  startedFrom: "",
  startedTo: "",
};

const RANGE_PRESETS: ArchivedRangePreset[] = ["24h", "48h", "week", "month"];

const inputClassName =
  "block w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500";

const buttonClassName =
  "px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50";

interface ArchivedJobsFilterSectionProps {
  filter: ArchivedJobsFilter;
  onFilterChange: (filter: ArchivedJobsFilter) => void;
  /** Active range preset; null once the filter was applied without one */
  range: ArchivedRangePreset | null;
  onRangeChange: (range: ArchivedRangePreset) => void;
  onApply: () => void;
  onClear: () => void;
  className?: string;
}

/**
 * Filter form for archived jobs. The filter passed in
 * is the draft being edited; the parent decides what "apply" does with it.
 */
export function ArchivedJobsFilterSection({
  filter,
  onFilterChange,
  range,
  onRangeChange,
  onApply,
  onClear,
  className = "",
}: ArchivedJobsFilterSectionProps) {
  const { t } = useTranslation();
  // Number and datetime inputs holding partial or invalid input report "" while
  // still showing it, so resetting the state to "" leaves them untouched - remount
  // them on clear instead
  const [resetKey, setResetKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Applying an empty filter lists the whole archive - ask first
  const handleApply = () => {
    if (Object.values(filter).every((value) => value.trim() === "")) {
      setConfirmOpen(true);
      return;
    }
    onApply();
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onApply();
  };

  const handleClear = () => {
    setResetKey((key) => key + 1);
    onClear();
  };

  const updateFilter = (key: keyof ArchivedJobsFilter, value: string) => {
    onFilterChange({ ...filter, [key]: value });
  };

  const renderTextField = (key: keyof ArchivedJobsFilter, label: string, placeholder?: string) => (
    <label className="block">
      <span className="block text-sm text-gray-600 mb-1">{label}</span>
      <input
        type="text"
        value={filter[key]}
        onChange={(e) => updateFilter(key, e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  );

  const renderRangeField = (
    fromKey: keyof ArchivedJobsFilter,
    toKey: keyof ArchivedJobsFilter,
    label: string,
    type: "text" | "number" | "datetime-local",
    placeholder?: string
  ) => {
    // Number ranges can't go below 0 - typed negatives are clamped
    const handleChange = (key: keyof ArchivedJobsFilter, value: string) =>
      updateFilter(key, type === "number" && value !== "" && Number(value) < 0 ? "0" : value);
    // Datetime inputs are too wide to sit side by side on a phone - stack them
    // there and label each one instead of the dash
    const stack = type === "datetime-local";
    const renderInput = (key: keyof ArchivedJobsFilter, bound: "from" | "to") => (
      <input
        type={type}
        value={filter[key]}
        onChange={(e) => handleChange(key, e.target.value)}
        min={type === "number" ? 0 : undefined}
        placeholder={placeholder}
        aria-label={`${label} ${t(`jobsArchive.filter.${bound}`)}`}
        className={`${inputClassName} min-w-0`}
      />
    );
    const renderBound = (key: keyof ArchivedJobsFilter, bound: "from" | "to") =>
      stack ? (
        <div className="flex items-center gap-2 sm:contents">
          <span className="w-10 shrink-0 text-sm text-gray-500 sm:hidden">{t(`jobsArchive.filter.${bound}`)}</span>
          {renderInput(key, bound)}
        </div>
      ) : (
        renderInput(key, bound)
      );
    return (
      <div key={`${fromKey}-${resetKey}`}>
        <span className="block text-sm text-gray-600 mb-1">{label}</span>
        <div className={stack ? "flex flex-col gap-2 sm:flex-row sm:items-center" : "flex items-center gap-2"}>
          {renderBound(fromKey, "from")}
          <span className={stack ? "hidden sm:inline text-gray-500" : "text-gray-500"}>–</span>
          {renderBound(toKey, "to")}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-4 sm:px-6 py-3">
        <span className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Icon icon="mdi:filter-outline" className="w-5 h-5" />
          {t("jobsArchive.filter.title")}
        </span>
      </div>
      <div className="border-t border-gray-200 px-4 sm:px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {/* Range takes the whole row so the column next to it stays empty */}
          <div className="md:col-span-2 pb-3 mb-1 border-b border-gray-200">
            <span className="block text-sm text-gray-600 mb-1">{t("jobsArchive.filter.range")}</span>
            <div className="flex flex-wrap gap-2">
              {RANGE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onRangeChange(preset)}
                  aria-pressed={range === preset}
                  className={
                    range === preset
                      ? "px-3 py-1.5 text-sm font-medium text-white bg-primary-600 border border-primary-600 rounded-md hover:bg-primary-700"
                      : buttonClassName
                  }
                >
                  {t(`jobsArchive.filter.ranges.${preset}`)}
                </button>
              ))}
            </div>
          </div>
          {renderRangeField("cpusFrom", "cpusTo", t("jobsArchive.filter.cpus"), "number")}
          {renderRangeField("gpusFrom", "gpusTo", t("jobsArchive.filter.gpus"), "number")}
          {renderRangeField(
            "walltimeFrom",
            "walltimeTo",
            t("jobsArchive.filter.walltime"),
            "text",
            "H:MM:SS"
          )}
          {renderRangeField(
            "runtimeFrom",
            "runtimeTo",
            t("jobsArchive.filter.runtime"),
            "text",
            "H:MM:SS"
          )}
          {renderTextField("pbsServer", t("jobsArchive.filter.pbsServer"))}
          {renderRangeField("recordFrom", "recordTo", t("jobsArchive.filter.recordTime"), "datetime-local")}
          {renderRangeField("createdFrom", "createdTo", t("jobsArchive.filter.createdAt"), "datetime-local")}
          {renderRangeField("startedFrom", "startedTo", t("jobsArchive.filter.startedAt"), "datetime-local")}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleApply}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            {t("jobsArchive.filter.apply")}
          </button>
          <button onClick={handleClear} className={buttonClassName}>
            {t("jobsArchive.filter.clear")}
          </button>
        </div>
      </div>
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setConfirmOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setConfirmOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archived-no-filter-warning"
            className="w-full max-w-md bg-white rounded-lg shadow-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="archived-no-filter-warning" className="flex items-start gap-3 text-sm text-gray-900">
              <Icon icon="mdi:alert-outline" className="w-6 h-6 shrink-0 text-amber-500" />
              {t("jobsArchive.filter.noFilterWarning")}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button autoFocus onClick={() => setConfirmOpen(false)} className={buttonClassName}>
                {t("jobsArchive.filter.cancel")}
              </button>
              <button
                onClick={handleConfirm}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                {t("jobsArchive.filter.continue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
