import type { GraphField, GraphValues, LeafField, Range } from "./types";

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Previous calendar month: first day .. last day */
export function lastMonthRange(): Range {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: formatDate(from), to: formatDate(to) };
}

/** Flattens rows so that every value-carrying field is listed once */
export function leafFields(fields: GraphField[]): LeafField[] {
  return fields.flatMap((field) =>
    field.type === "row" ? field.fields : [field],
  );
}

function defaultValue(field: LeafField) {
  switch (field.type) {
    case "select":
      return (
        field.default ??
        (field.placeholder !== undefined ? "" : (field.options[0]?.value ?? ""))
      );
    case "radio":
      return field.default ?? field.options[0]?.value ?? "";
    case "text":
    case "number":
      return field.default ?? "";
    case "checkbox":
      return field.default ?? false;
    case "dateRange":
      return field.default?.() ?? lastMonthRange();
    case "numberRange":
      return field.default?.() ?? { from: "", to: "" };
  }
}

/** Builds the initial values of a graph form from its field definitions */
export function createDefaultValues(fields: GraphField[]): GraphValues {
  return Object.fromEntries(
    leafFields(fields).map((field) => [field.name, defaultValue(field)]),
  );
}
