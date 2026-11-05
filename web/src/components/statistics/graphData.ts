import type { StatisticsGraphDataDTO } from "@/lib/generated-api";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function graphDataToCsv(data: StatisticsGraphDataDTO): string {
  return [data.columns, ...data.rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

/** Lets the browser save the graph data as a CSV file */
export function downloadGraphDataCsv(data: StatisticsGraphDataDTO) {
  const blob = new Blob([graphDataToCsv(data)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.graphId}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  // Revoke later: revoking in the same tick can cancel the download in some browsers
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
