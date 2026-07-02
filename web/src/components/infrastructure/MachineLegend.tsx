import { useTranslation } from "react-i18next";

export const MachineLegend = function MachineLegend({
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        {t("machines.nodeStateLegend")}
      </h2>
      <div className="flex flex-wrap gap-4">
        {[
          { state: "free", color: "#22c55e", label: t("machines.nodeState.free") },
          { state: "partially_used", color: "#86efac", label: t("machines.nodeState.partiallyUsed") },
          { state: "used", color: "#3b82f6", label: t("machines.nodeState.used") },
          { state: "maintenance", color: "#f59e0b", label: t("machines.nodeState.maintenance") || "Maintenance" },
          { state: "not-available", color: "#ef4444", label: t("machines.nodeState.notAvailable") || "Not Available" },
          { state: "unknown", color: "#eab308", label: t("machines.nodeState.unknown") },
        ].map(({ state, color, label }) => (
          <div key={state} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
