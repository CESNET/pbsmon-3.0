export type ChartShape =
  | "area"
  | "line"
  | "barVertical"
  | "barHorizontal"
  | "pie";

/** What the user asked for when submitting a graph form */
export type GraphAction = "show" | "download";

/** Generic from/to range (dates as YYYY-MM-DD, numbers as strings) */
export type Range = { from: string; to: string };

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export type GraphFieldValue = string | boolean | Range;
export type GraphValues = Record<string, GraphFieldValue>;

interface NamedField {
  /** Key under which the value is stored in GraphValues */
  name: string;
}

export interface SelectField extends NamedField {
  type: "select";
  label: string;
  options: SelectOption[];
  /** When set, an empty option with this text is shown first */
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
  /** Empty value blocks the form submission */
  required?: boolean;
  /** Defaults to the placeholder (empty) or the first option */
  default?: string;
}

export interface TextField extends NamedField {
  type: "text";
  label: string;
  default?: string;
  /**
   * When set, only these values (or an empty value) can be submitted;
   * they are offered as suggestions while typing
   */
  allowedValues?: string[];
  /** Message shown when the value is not one of allowedValues */
  notAllowedMessage?: string;
}

export interface NumberField extends NamedField {
  type: "number";
  label: string;
  min?: number;
  placeholder?: string;
  default?: string;
}

export interface RangeField extends NamedField {
  type: "dateRange" | "numberRange";
  label?: string;
  /** Both from and to must be filled to submit the form */
  required?: boolean;
  /** dateRange defaults to the previous calendar month, numberRange to empty */
  default?: () => Range;
}

export interface CheckboxField extends NamedField {
  type: "checkbox";
  label: string;
  default?: boolean;
}

export interface RadioField extends NamedField {
  type: "radio";
  label: string;
  options: SelectOption[];
  /** Defaults to the first option */
  default?: string;
}

export type LeafField =
  | SelectField
  | TextField
  | NumberField
  | RangeField
  | CheckboxField
  | RadioField;

/** Lays out several fields next to each other */
export interface RowField {
  type: "row";
  label?: string;
  description?: string;
  fields: LeafField[];
}

export type GraphField = LeafField | RowField;

/** Parametrization of a single statistics graph form */
export interface GraphDefinition {
  id: string;
  title: string;
  /** One paragraph per item */
  description: string | string[];
  /** Highlighted note shown below the description */
  warning?: string;
  fields: GraphField[];
  /** Show the reset button (default true) */
  resettable?: boolean;
}
