import { useTranslation } from "react-i18next";
import { QsubForm } from "@/components/qsub/QsubForm";
import { QsubResults } from "@/components/qsub/QsubResults";
import { useQsubPreview } from "@/hooks/useQsubPreview";

export function QsubAssemblerPage() {
  const { t } = useTranslation();
  const previewMutation = useQsubPreview();

  const handleSubmit = (values: any) => {
    previewMutation.mutate(values);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900">
            {t("pages.qsubAssembler")}
          </h1>
        </div>
      </header>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <QsubForm onSubmit={handleSubmit} />

        {previewMutation.isPending && (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500">Loading results...</div>
          </div>
        )}

        {previewMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              Error: {previewMutation.error?.message || "Unknown error"}
            </div>
          </div>
        )}

        {previewMutation.isSuccess && previewMutation.data && (
          <QsubResults
            qsubCommand={previewMutation.data.qsubCommand}
            qsubScript={previewMutation.data.qsubScript}
            qualifiedNodes={previewMutation.data.qualifiedNodes as any}
            totalCount={previewMutation.data.totalCount}
            immediatelyAvailableCount={
              previewMutation.data.immediatelyAvailableCount
            }
          />
        )}
      </div>
    </>
  );
}
