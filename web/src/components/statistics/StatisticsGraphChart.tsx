import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Shows an SVG chart rendered by the backend.
 * It is displayed as an image, so the SVG cannot run scripts in the page.
 * Clicking the chart (or the link below it) saves it as `fileName`.
 */
export function StatisticsGraphChart({
  svg,
  title,
  fileName,
}: {
  svg: string;
  title: string;
  fileName: string;
}) {
  const { t } = useTranslation();
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    [svg],
  );

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <a href={src} download={fileName} title={t("statistics.downloadSvg")}>
          <img src={src} alt={title} className="max-w-full h-auto" />
        </a>
      </div>
      <a
        href={src}
        download={fileName}
        className="text-sm text-primary-600 hover:text-primary-800"
      >
        {t("statistics.downloadSvg")} ({fileName})
      </a>
    </div>
  );
}
