import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useStatisticsGraphChart,
  useStatisticsGraphData,
} from "@/hooks/useStatistics";
import {
  Checkbox,
  FieldGroup,
  FieldRow,
  OptionsSelect,
  RadioGroup,
  RangeFields,
  TextInput,
} from "./FormControls";
import { StatisticsSection } from "./StatisticsSection";
import { StatisticsGraphChart } from "./StatisticsGraphChart";
import { downloadGraphDataCsv } from "./graphData";
import { createDefaultValues } from "./graphValues";
import type {
  GraphAction,
  GraphDefinition,
  GraphFieldValue,
  GraphValues,
  LeafField,
  Range,
} from "./types";

type SetValue = (name: string, value: GraphFieldValue) => void;

function LeafControl({
  graphId,
  field,
  values,
  setValue,
}: {
  graphId: string;
  field: LeafField;
  values: GraphValues;
  setValue: SetValue;
}) {
  const value = values[field.name];
  const onChange = (v: GraphFieldValue) => setValue(field.name, v);

  switch (field.type) {
    case "select":
      return (
        <OptionsSelect
          label={field.label}
          value={value as string}
          onChange={onChange}
          options={field.options}
          placeholder={field.placeholder}
          isLoading={field.isLoading}
          className={field.className}
          required={field.required}
        />
      );
    case "text":
      return (
        <TextInput
          label={field.label}
          value={value as string}
          onChange={onChange}
          allowedValues={field.allowedValues}
          notAllowedMessage={field.notAllowedMessage}
        />
      );
    case "number":
      return (
        <TextInput
          type="number"
          label={field.label}
          value={value as string}
          onChange={onChange}
          min={field.min}
          placeholder={field.placeholder}
        />
      );
    case "dateRange":
    case "numberRange":
      return (
        <RangeFields
          type={field.type === "dateRange" ? "date" : "number"}
          label={field.label}
          value={value as Range}
          onChange={onChange}
          required={field.required}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          label={field.label}
          checked={value as boolean}
          onChange={onChange}
        />
      );
    case "radio":
      return (
        <RadioGroup
          label={field.label}
          name={`${graphId}-${field.name}`}
          value={value as string}
          onChange={onChange}
          options={field.options}
        />
      );
  }
}

/**
 * Parametrized statistics graph: renders the form described by `definition`
 * and sends its values together with the graph id to the backend.
 * "Show graph" displays the SVG chart rendered by the backend,
 * "Download data" saves the underlying data as CSV.
 */
export function StatisticsGraph({ definition }: { definition: GraphDefinition }) {
  const { t } = useTranslation();
  const { id, title, description, warning, fields, resettable = true } =
    definition;

  const [values, setValues] = useState<GraphValues>(() =>
    createDefaultValues(fields),
  );
  const graphChart = useStatisticsGraphChart();
  const graphData = useStatisticsGraphData();
  const error = graphChart.error ?? graphData.error;

  const setValue: SetValue = (name, value) =>
    setValues((prev) => ({ ...prev, [name]: value }));
  const reset = () => {
    setValues(createDefaultValues(fields));
    graphChart.reset();
    graphData.reset();
  };

  const handleAction = (action: GraphAction) => {
    const request = { graphId: id, params: values };
    if (action === "download") {
      graphChart.reset();
      graphData.mutate(request, { onSuccess: downloadGraphDataCsv });
    } else {
      graphData.reset();
      graphChart.mutate(request);
    }
  };

  return (
    <StatisticsSection
      title={title}
      description={description}
      warning={warning}
      onAction={handleAction}
      onReset={resettable ? reset : undefined}
      isBusy={graphChart.isPending || graphData.isPending}
    >
      {fields.map((field, i) =>
        field.type === "row" ? (
          <FieldGroup
            key={`row-${i}`}
            label={field.label}
            description={field.description}
          >
            <FieldRow>
              {field.fields.map((leaf) => (
                <LeafControl
                  key={leaf.name}
                  graphId={id}
                  field={leaf}
                  values={values}
                  setValue={setValue}
                />
              ))}
            </FieldRow>
          </FieldGroup>
        ) : (
          <LeafControl
            key={field.name}
            graphId={id}
            field={field}
            values={values}
            setValue={setValue}
          />
        ),
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {t("statistics.loadError")} {error.message}
        </div>
      )}
      {graphChart.data && (
        <StatisticsGraphChart
          svg={graphChart.data.svg}
          title={title}
          fileName={`${graphChart.data.graphId}.svg`}
        />
      )}
    </StatisticsSection>
  );
}
