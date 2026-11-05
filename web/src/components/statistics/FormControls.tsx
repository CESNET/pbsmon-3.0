import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Range, SelectOption } from "./types";

const inputClass =
  "px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-4">{children}</div>;
}

export function FieldGroup({
  label,
  description,
  children,
}: {
  label?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {label && <span className={labelClass}>{label}</span>}
      {description && (
        <p className="text-sm text-gray-600 mb-2">{description}</p>
      )}
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  placeholder,
  allowedValues,
  notAllowedMessage,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  min?: number;
  placeholder?: string;
  /** Only these values (or empty) pass the form validation, offered as suggestions */
  allowedValues?: string[];
  notAllowedMessage?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Block the form submission with a message when the value is not allowed
  useEffect(() => {
    const allowed =
      !allowedValues || value === "" || allowedValues.includes(value.trim());
    inputRef.current?.setCustomValidity(
      allowed ? "" : (notAllowedMessage ?? "Value not allowed"),
    );
  }, [allowedValues, notAllowedMessage, value]);

  return (
    <Field label={label}>
      <input
        ref={inputRef}
        type={type}
        min={min}
        placeholder={placeholder}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={allowedValues ? listId : undefined}
        autoComplete={allowedValues ? "off" : undefined}
      />
      {allowedValues && (
        <datalist id={listId}>
          {allowedValues.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </Field>
  );
}

export function RangeFields({
  value,
  onChange,
  type,
  label,
  required,
}: {
  value: Range;
  onChange: (value: Range) => void;
  type: "date" | "number";
  label?: string;
  required?: boolean;
}) {
  const { t } = useTranslation();
  const isDate = type === "date";
  return (
    <FieldGroup label={label}>
      <FieldRow>
        <Field label={t("statistics.from")}>
          <input
            type={type}
            className={inputClass}
            value={value.from}
            required={required}
            min={isDate ? undefined : 0}
            max={isDate ? value.to || undefined : undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </Field>
        <Field label={t("statistics.to")}>
          <input
            type={type}
            className={inputClass}
            value={value.to}
            required={required}
            min={isDate ? value.from || undefined : 0}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </Field>
      </FieldRow>
    </FieldGroup>
  );
}

export function OptionsSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  isLoading,
  className,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
  required?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Field label={label}>
      <select
        className={`${inputClass} ${className ?? ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        required={required}
      >
        {placeholder !== undefined && (
          <option value="">
            {isLoading ? t("common.loading") : placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex items-center gap-2 text-sm text-gray-700"
          >
            <input
              type="radio"
              name={name}
              className="border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
