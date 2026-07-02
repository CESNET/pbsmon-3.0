import { useForm, Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useQsubConfig } from "@/hooks/useQsubConfig";
import Select from "react-select";
import { Tooltip } from "react-tooltip";
import { Icon } from "@iconify/react";
import type { QsubFieldConfigDto } from "@/lib/generated-api";

interface QsubFormValues {
  [key: string]: any;
}

interface QsubFormProps {
  onSubmit: (values: QsubFormValues) => void;
}

export function QsubForm({ onSubmit }: QsubFormProps) {
  const { i18n } = useTranslation();
  const { data: config, isLoading } = useQsubConfig();
  const currentLang = (i18n.language || "en").split("-")[0] as "en" | "cs";

  const defaultValues =
    config?.fields.reduce((acc: QsubFormValues, field: QsubFieldConfigDto) => {
      if (field.default !== undefined && field.default !== null) {
        acc[field.name] = field.default;
      }
      return acc;
    }, {} as QsubFormValues) || {};

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<QsubFormValues>({
    defaultValues,
  });

  const watchedValues = watch();
  const scratchType = useWatch({ control, name: "scratch_type" });

  // Reset form with default values when config loads
  useEffect(() => {
    if (config) {
      const newDefaults = config.fields.reduce((acc: QsubFormValues, field: QsubFieldConfigDto) => {
        if (field.default !== undefined && field.default !== null) {
          acc[field.name] = field.default;
        }
        return acc;
      }, {} as QsubFormValues);
      reset(newDefaults);
    }
  }, [config, reset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading form configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Failed to load form configuration</div>
      </div>
    );
  }

  const basicFields = config.fields.filter((f: QsubFieldConfigDto) => f.category === "basic");
  const advancedFields = config.fields.filter((f: QsubFieldConfigDto) => f.category === "advanced");
  const allFields = [...basicFields, ...advancedFields];

  const getLabel = (field: (typeof config.fields)[0]) => {
    return field.label[currentLang] || field.label.en;
  };

  const getDescription = (field: (typeof config.fields)[0]) => {
    if (!field.description) return undefined;
    return field.description[currentLang] || field.description.en;
  };

  const renderField = (field: (typeof config.fields)[0]) => {
    const label = getLabel(field);
    const description = getDescription(field);
    const tooltipId = `tooltip-${field.name}`;
    const isVisible =
      !field.dependsOn ||
      field.dependsOn.every((dep: string) => {
        const depValue = watchedValues[dep];
        return depValue !== undefined && depValue !== null && depValue !== "";
      });

    if (!isVisible) return null;

    const renderLabel = () => (
      <div className="flex items-center gap-1 mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {description && (
          <>
            <Icon
              icon="mdi:information-outline"
              className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
              data-tooltip-id={tooltipId}
              data-tooltip-content={description}
            />
            <Tooltip
              id={tooltipId}
              style={{ maxWidth: "300px", whiteSpace: "normal" }}
            />
          </>
        )}
      </div>
    );

    const fieldElement = (() => {
      switch (field.type) {
        case "select":
          return (
            <div>
              {renderLabel()}
              <select
                {...register(field.name, {
                  required: field.required,
                })}
                defaultValue={defaultValues[field.name] || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {field.name === "queue" ||
                field.name === "scratch_type" ? null : (
                  <option value="">-- Select --</option>
                )}
                {field.options?.map((option: Record<string, any> | string) => {
                  const optionValue =
                    typeof option === "string" ? option : option.value;
                  const optionLabel =
                    typeof option === "string"
                      ? option
                      : option.label || option.value;
                  return (
                    <option key={optionValue} value={optionValue}>
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  This field is required
                </p>
              )}
            </div>
          );

        case "multiselect":
          return (
            <div>
              {renderLabel()}
              <Controller
                name={field.name}
                control={control}
                rules={{ required: field.required }}
                render={({ field: formField }) => {
                  const options =
                    field.options?.map((option: Record<string, any> | string) => {
                      const optionValue =
                        typeof option === "string" ? option : option.value;
                      const optionLabel =
                        typeof option === "string"
                          ? option
                          : option.label || option.value;
                      return {
                        value: optionValue,
                        label: optionLabel,
                      };
                    }) || [];

                  const selectedValues = Array.isArray(formField.value)
                    ? formField.value
                    : [];

                  return (
                    <Select
                      isMulti
                      options={options}
                      value={options.filter((opt: { value: string; label: string }) =>
                        selectedValues.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        formField.onChange(
                          selected ? selected.map((s) => s.value) : []
                        );
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors[field.name]
                            ? "#dc2626"
                            : "#d1d5db",
                          "&:hover": {
                            borderColor: errors[field.name]
                              ? "#dc2626"
                              : "#9ca3af",
                          },
                        }),
                      }}
                    />
                  );
                }}
              />
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  This field is required
                </p>
              )}
            </div>
          );

        case "number":
          return (
            <div>
              {renderLabel()}
              <input
                type="number"
                {...register(field.name, {
                  required: field.required,
                  valueAsNumber: true,
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  This field is required
                </p>
              )}
            </div>
          );

        case "time":
          return (
            <div>
              {renderLabel()}
              <Controller
                name={field.name}
                control={control}
                rules={{
                  required: field.required,
                  validate: (value) => {
                    if (!field.required && !value) return true;
                    const parts = value?.split(":") || [];
                    if (parts.length !== 3) return false;
                    const [h, m, s] = parts.map(Number);
                    return (
                      !isNaN(h) &&
                      !isNaN(m) &&
                      !isNaN(s) &&
                      h >= 0 &&
                      h <= 720 &&
                      m >= 0 &&
                      m < 60 &&
                      s >= 0 &&
                      s < 60
                    );
                  },
                }}
                render={({ field: formField }) => {
                  const currentValue =
                    formField.value || defaultValues[field.name] || "00:00:00";
                  const parts = currentValue.split(":");
                  const hours = parts[0] || "";
                  const minutes = parts[1] || "";
                  const seconds = parts[2] || "";

                  const updateTime = (h: string, m: string, s: string) => {
                    const hNum =
                      h === ""
                        ? 0
                        : Math.max(0, Math.min(720, parseInt(h) || 0));
                    const mNum =
                      m === ""
                        ? 0
                        : Math.max(0, Math.min(59, parseInt(m) || 0));
                    const sNum =
                      s === ""
                        ? 0
                        : Math.max(0, Math.min(59, parseInt(s) || 0));
                    const formatted = `${String(hNum).padStart(2, "0")}:${String(mNum).padStart(2, "0")}:${String(sNum).padStart(2, "0")}`;
                    formField.onChange(formatted);
                  };

                  return (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="720"
                          placeholder="HH"
                          value={hours}
                          onChange={(e) => {
                            const h = e.target.value;
                            updateTime(h, minutes, seconds);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center"
                        />
                      </div>
                      <span className="self-center text-gray-500">:</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="MM"
                          value={minutes}
                          onChange={(e) => {
                            const m = e.target.value;
                            updateTime(hours, m, seconds);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center"
                        />
                      </div>
                      <span className="self-center text-gray-500">:</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="SS"
                          value={seconds}
                          onChange={(e) => {
                            const s = e.target.value;
                            updateTime(hours, minutes, s);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center"
                        />
                      </div>
                    </div>
                  );
                }}
              />
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  Please enter a valid time (HH:MM:SS)
                </p>
              )}
            </div>
          );

        case "memory":
          // Check if this is scratch_memory and should be disabled
          const isScratchMemory = field.name === "scratch_memory";
          const isMemoryDisabled = isScratchMemory && scratchType === "shm";

          return (
            <div>
              {renderLabel()}
              <Controller
                name={field.name}
                control={control}
                rules={{ required: field.required && !isMemoryDisabled }}
                render={({ field: formField }) => {
                  const currentValue = formField.value || {
                    amount: "",
                    unit: "mb",
                  };
                  const amount =
                    typeof currentValue === "object"
                      ? currentValue.amount || ""
                      : "";
                  const unit =
                    typeof currentValue === "object"
                      ? currentValue.unit || "mb"
                      : "mb";

                  return (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={amount}
                          onChange={(e) => {
                            const newAmount = e.target.value;
                            formField.onChange({
                              amount: newAmount,
                              unit: unit,
                            });
                          }}
                          disabled={isMemoryDisabled}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            isMemoryDisabled
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      </div>
                      <div className="w-24">
                        <select
                          value={unit}
                          onChange={(e) => {
                            formField.onChange({
                              amount: amount,
                              unit: e.target.value,
                            });
                          }}
                          disabled={isMemoryDisabled}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            isMemoryDisabled
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <option value="mb">MB</option>
                          <option value="gb">GB</option>
                        </select>
                      </div>
                    </div>
                  );
                }}
              />
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  This field is required
                </p>
              )}
            </div>
          );

        case "boolean":
          return (
            <div>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  {...register(field.name)}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  {label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {description && (
                  <>
                    <Icon
                      icon="mdi:information-outline"
                      className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                      data-tooltip-id={tooltipId}
                      data-tooltip-content={description}
                    />
                    <Tooltip
                      id={tooltipId}
                      style={{ maxWidth: "300px", whiteSpace: "normal" }}
                    />
                  </>
                )}
              </div>
            </div>
          );

        default:
          return (
            <div>
              {renderLabel()}
              <input
                type="text"
                {...register(field.name, { required: field.required })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  This field is required
                </p>
              )}
            </div>
          );
      }
    })();

    return <div key={field.name}>{fieldElement}</div>;
  };

  // Group fields into pairs for two-column layout
  const fieldPairs: Array<
    [(typeof allFields)[0] | null, (typeof allFields)[0] | null]
  > = [];
  for (let i = 0; i < allFields.length; i += 2) {
    fieldPairs.push([allFields[i] || null, allFields[i + 1] || null]);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* All Settings in One Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {currentLang === "cs" ? "Nastavení" : "Settings"}
        </h2>
        <div className="space-y-6">
          {/* Basic Settings Section */}
          {basicFields.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {currentLang === "cs" ? "Základní nastavení" : "Basic Settings"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {basicFields.map((field: QsubFieldConfigDto) => renderField(field))}
              </div>
            </div>
          )}

          {/* Advanced Settings Section */}
          {advancedFields.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {currentLang === "cs"
                  ? "Pokročilá nastavení"
                  : "Advanced Settings"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {advancedFields.map((field: QsubFieldConfigDto) => renderField(field))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          {currentLang === "cs" ? "Zobrazit výsledky" : "Show Results"}
        </button>
      </div>
    </form>
  );
}
