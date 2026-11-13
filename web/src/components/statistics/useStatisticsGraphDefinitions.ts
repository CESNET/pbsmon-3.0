import { useTranslation } from "react-i18next";
import {
  useStatisticsClusters,
  useStatisticsOrganizations,
  useStatisticsQueues,
} from "@/hooks/useStatistics";
import type { StatisticsAccessDTO } from "@/lib/generated-api";
import type {
  ChartShape,
  GraphDefinition,
  GraphField,
  LeafField,
  SelectField,
  SelectOption,
} from "./types";

/**
 * Organization value selecting all the academies; must match ALL_ACADEMIES
 * in api/src/modules/accounting/statistics/statistics-graph-queries.ts
 */
const ALL_ACADEMIES = "__academies__";

const toOptions = (names: string[] | undefined): SelectOption[] =>
  (names ?? []).map((name) => ({ value: name, label: name }));

/**
 * Definitions of all graphs on the statistics page, in display order.
 *
 * The graph `id` selects the SQL query on the backend
 * (api/src/modules/accounting/statistics/statistics-graph-queries.ts) and the
 * field `name`s are the parameters passed to it.
 *
 * `access` limits what the user can enter (e.g. only users from their
 * groups); the backend enforces the same limits.
 */
export function useStatisticsGraphDefinitions(
  enabled: boolean,
  access?: StatisticsAccessDTO,
): GraphDefinition[] {
  const { t } = useTranslation();

  const clustersQuery = useStatisticsClusters(enabled);
  const queuesQuery = useStatisticsQueues(enabled);
  const organizationsQuery = useStatisticsOrganizations(enabled);

  // "All the Academies" first (only for users not limited in organizations),
  // then the particular organizations
  const organizationOptions: SelectOption[] = [
    ...(access?.organizations
      ? []
      : [{ value: ALL_ACADEMIES, label: t("statistics.allAcademies") }]),
    ...(organizationsQuery.data ?? []).map((org) => ({
      value: org.name,
      label: org.idpName,
    })),
  ];

  // --- reusable field builders ---------------------------------------------

  const shapeField = (shapes: ChartShape[]): SelectField => ({
    type: "select",
    name: "shape",
    label: t("statistics.chartShape"),
    options: shapes.map((shape) => ({
      value: shape,
      label: t(`statistics.chartShapes.${shape}`),
    })),
  });

  const clusterField: SelectField = {
    type: "select",
    name: "cluster",
    label: t("statistics.cluster"),
    options: toOptions(clustersQuery.data),
    placeholder: t("statistics.selectCluster"),
    isLoading: clustersQuery.isLoading,
    className: "min-w-[16rem]",
  };

  const queueField: SelectField = {
    type: "select",
    name: "queue",
    label: t("statistics.queue"),
    options: toOptions(queuesQuery.data),
    placeholder: t("statistics.selectQueue"),
    isLoading: queuesQuery.isLoading,
    className: "min-w-[12rem]",
  };

  const organizationField: SelectField = {
    type: "select",
    name: "organization",
    label: t("statistics.organization"),
    options: organizationOptions,
    placeholder: t("statistics.allOrganizations"),
    isLoading: organizationsQuery.isLoading,
    className: "min-w-[16rem] max-w-full",
  };

  const userField: LeafField = {
    type: "text",
    name: "user",
    label: t("statistics.userNickname"),
    allowedValues: access?.users,
    notAllowedMessage: t("statistics.userNotAllowed"),
  };

  const period: LeafField = {
    type: "dateRange",
    name: "period",
    required: true,
  };

  /** Fields of the job wait time / run time histograms in a queue */
  const queueDurationFields = (): GraphField[] => [
    {
      type: "row",
      fields: [
        { ...queueField, required: true },
        shapeField(["barVertical", "barHorizontal", "pie"]),
      ],
    },
    period,
    {
      type: "checkbox",
      name: "omitShortBar",
      label: t("statistics.omitShortBar"),
    },
  ];

  /** Groups all the academies into one organization ('AV ČR') */
  const groupAcademiesField: LeafField = {
    type: "checkbox",
    name: "groupAcademies",
    label: t("statistics.groupAcademies"),
  };

  /**
   * Fields of the organization / user rankings: an optional organization
   * (empty = all organizations), optionally a user, chart shape and period
   */
  const rankingFields = (withUser = false): GraphField[] => [
    {
      type: "row",
      fields: [
        ...(withUser ? [userField] : []),
        organizationField,
        shapeField(["barVertical", "barHorizontal", "pie"]),
      ],
    },
    period,
  ];

  // --- graphs --------------------------------------------------------------

  return [
    {
      id: "clusterUsage",
      title: t("statistics.clusterUsage.title"),
      description: t("statistics.clusterUsage.description"),
      fields: [
        {
          type: "row",
          fields: [
            { ...clusterField, required: true },
            shapeField(["area", "line"]),
          ],
        },
        period,
      ],
    },
    {
      id: "averageUsage",
      title: t("statistics.averageUsage.title"),
      description: t("statistics.averageUsage.description"),
      fields: [shapeField(["barVertical", "barHorizontal"]), period],
    },
    {
      id: "queueWaitTime",
      title: t("statistics.queueWaitTime.title"),
      description: t("statistics.queueWaitTime.description"),
      fields: queueDurationFields(),
    },
    {
      id: "queueRunTime",
      title: t("statistics.queueRunTime.title"),
      description: t("statistics.queueRunTime.description"),
      fields: queueDurationFields(),
    },
    {
      id: "clusterOrganizationsByComputedTime",
      title: t("statistics.clusterOrganizationsByComputedTime.title"),
      description: t("statistics.clusterOrganizationsByComputedTime.description"),
      fields: [
        {
          type: "row",
          fields: [
            { ...clusterField, required: true },
            shapeField(["barVertical", "barHorizontal", "pie"]),
          ],
        },
        period,
        groupAcademiesField,
      ],
    },
    {
      id: "organizationsByComputedTime",
      title: t("statistics.organizationsByComputedTime.title"),
      description: t("statistics.organizationsByComputedTime.description"),
      fields: [...rankingFields(), groupAcademiesField],
    },
    {
      id: "organizationsByJobCount",
      title: t("statistics.organizationsByJobCount.title"),
      description: t("statistics.organizationsByJobCount.description"),
      fields: [...rankingFields(), groupAcademiesField],
    },
    {
      id: "usersByComputedTime",
      title: t("statistics.usersByComputedTime.title"),
      description: t("statistics.usersByComputedTime.description"),
      fields: rankingFields(true),
    },
    {
      id: "usersByJobCount",
      title: t("statistics.usersByJobCount.title"),
      description: t("statistics.usersByJobCount.description"),
      fields: rankingFields(true),
    },
    {
      id: "queuesByJobCount",
      title: t("statistics.queuesByJobCount.title"),
      description: t("statistics.queuesByJobCount.description"),
      fields: rankingFields(true),
    },
    {
      id: "queuesByComputedTime",
      title: t("statistics.queuesByComputedTime.title"),
      description: t("statistics.queuesByComputedTime.description"),
      fields: rankingFields(true),
    },
    {
      id: "clustersByComputedTime",
      title: t("statistics.clustersByComputedTime.title"),
      description: t("statistics.clustersByComputedTime.description"),
      fields: rankingFields(true),
    },
    {
      id: "clustersByJobCount",
      title: t("statistics.clustersByJobCount.title"),
      description: t("statistics.clustersByJobCount.description"),
      fields: rankingFields(true),
    },
  ];
}
