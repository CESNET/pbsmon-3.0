import { Tooltip } from "react-tooltip";

interface ProgressBarMinimalProps {
  percent: number;
  label: string;
  value: number | string;
  color: string | ((percent: number) => string);
  backgroundColor?: string;
  tooltip?: string;
  tooltipId?: string;
}

export function ProgressBarMinimal({
  percent,
  label,
  value,
  color,
  backgroundColor,
  tooltip,
  tooltipId,
}: ProgressBarMinimalProps) {
  // Clamp percent between 0 and 100
  const clampedPercent = Math.max(0, Math.min(100, percent));

  const colorHex = typeof color === "string" ? color : color(clampedPercent);
  const backgroundColorHex = typeof backgroundColor === "string" ? backgroundColor : undefined;

  const text = `${label} ${value}`;
  const fillWidth = `${clampedPercent}%`;
  const showTextInCenter = clampedPercent < 60;
  const resolvedTooltipId = tooltipId ?? `progress-bar-minimal-${label}`;

  return (
    <div className="w-full">

      {/* Progress bar */}
      <div
        className={`relative w-full h-[21px] border rounded-[4px] overflow-hidden`}
        style={{ borderColor: colorHex, backgroundColor: backgroundColorHex}}
        {...(tooltip ? { "data-tooltip-id": resolvedTooltipId, "data-tooltip-content": tooltip } : {})}
      >
        {/* Filled portion */}
        <div
          className={`h-full transition-all duration-300 ${
            !showTextInCenter ? "flex items-center justify-center" : ""
          }`}
          style={{ width: fillWidth, backgroundColor: colorHex }}
        >
          {!showTextInCenter && (
            <span className="text-sm font-medium text-white">
              {text}
            </span>
          )}
        </div>
        {/* Text in center for low percentages */}
        {showTextInCenter && typeof backgroundColor !== "string" && (
          <span
            className={`absolute inset-0 flex items-center justify-center text-sm font-medium`}
            style={{ color: colorHex }}
          >
            {text}
          </span>
        )}
        {showTextInCenter && typeof backgroundColor === "string" && (
          <span
            className={`absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900`}
          >
            {text}
          </span>
        )}
      </div>
      {tooltip && <Tooltip id={resolvedTooltipId} />}
    </div>
  );
}
