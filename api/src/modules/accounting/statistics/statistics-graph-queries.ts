import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  BarChart,
  ChartSpec,
  barChart,
  formatDay,
  pieChart,
  timeSeriesChart,
  toDay,
  toNumber,
} from './charts';

/** Raw graph parameters as sent by the frontend form */
export type StatisticsGraphParams = Record<string, unknown>;

/**
 * What the requesting user may see in statistics (see
 * AccountingService.getStatisticsAccess()).
 */
export interface StatisticsGraphAccess {
  /** Clusters (physical resource names) the user may see, null = all */
  clusters: string[] | null;
  /** Usernames allowed in the 'user' parameter, null = any */
  users: ReadonlySet<string> | null;
  /**
   * Organizations allowed in the 'organization' parameter, null = any.
   * An empty parameter (all organizations) is always allowed.
   */
  organizations: string[] | null;
}

/**
 * SQL query behind one statistics graph.
 *
 * To add a graph, add an entry to STATISTICS_GRAPH_QUERIES keyed by the graph
 * id used in the frontend (useStatisticsGraphDefinitions.ts).
 */
export interface StatisticsGraphQuery {
  /** Parametrized SQL ($1, $2, ...) - never interpolate request values */
  sql: string;
  /**
   * Validates the request parameters and returns the values bound to the
   * SQL placeholders, in order. Throws BadRequestException on invalid input
   * and ForbiddenException on parameters outside the user's access.
   *
   * Every graph must respect `access`: check a cluster parameter with
   * requireCluster(), a user parameter with optionalUser(), an
   * organization parameter with optionalOrganization(), and limit
   * the data to `access.clusters` (e.g. with jobOnClusters()).
   */
  values: (
    params: StatisticsGraphParams,
    access: StatisticsGraphAccess,
  ) => unknown[];
  /**
   * Builds the chart (ECharts option, see statistics/charts.ts) from the
   * query result (rows keyed by column name) and the request parameters.
   * Graphs without it have no "Show graph".
   */
  chart?: (
    rows: Record<string, unknown>[],
    params: StatisticsGraphParams,
  ) => ChartSpec;
}

// --- parameter helpers --------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD of a real calendar day (rejects e.g. 2024-02-30) */
function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Non-empty string parameter */
export function requireString(
  params: StatisticsGraphParams,
  name: string,
): string {
  const value = params[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`Parameter '${name}' is required`);
  }
  return value.trim();
}

/** Optional string parameter, empty string is treated as missing */
export function optionalString(
  params: StatisticsGraphParams,
  name: string,
): string | null {
  const value = params[name];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`Parameter '${name}' must be a string`);
  }
  return value.trim() || null;
}

/** Optional non-negative number, accepts numbers and numeric strings */
export function optionalNumber(
  params: StatisticsGraphParams,
  name: string,
): number | null {
  const value = params[name];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new BadRequestException(
      `Parameter '${name}' must be a non-negative number`,
    );
  }
  return num;
}

/** Boolean parameter, missing means false */
export function optionalBoolean(
  params: StatisticsGraphParams,
  name: string,
): boolean {
  const value = params[name];
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`Parameter '${name}' must be a boolean`);
  }
  return value;
}

/** Parameter restricted to a fixed set of values */
export function requireOneOf<T extends string>(
  params: StatisticsGraphParams,
  name: string,
  allowed: readonly T[],
): T {
  const value = params[name];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestException(
      `Parameter '${name}' must be one of: ${allowed.join(', ')}`,
    );
  }
  return value as T;
}

/** Date range { from, to } with dates as YYYY-MM-DD, returns [from, to] */
export function requireDateRange(
  params: StatisticsGraphParams,
  name: string,
): [string, string] {
  const value = params[name] as { from?: unknown; to?: unknown } | undefined;
  const from = value?.from;
  const to = value?.to;
  if (
    typeof from !== 'string' ||
    typeof to !== 'string' ||
    !isValidDate(from) ||
    !isValidDate(to)
  ) {
    throw new BadRequestException(
      `Parameter '${name}' must be a date range { from, to } in YYYY-MM-DD format`,
    );
  }
  if (from > to) {
    throw new BadRequestException(`Parameter '${name}': 'from' is after 'to'`);
  }
  return [from, to];
}

// --- access helpers -----------------------------------------------------------

/** Required 'cluster' parameter, which must be one of the user's clusters */
export function requireCluster(
  params: StatisticsGraphParams,
  access: StatisticsGraphAccess,
): string {
  const cluster = requireString(params, 'cluster');
  if (access.clusters && !access.clusters.includes(cluster)) {
    throw new ForbiddenException(`Access to cluster '${cluster}' denied`);
  }
  return cluster;
}

/** Optional 'user' parameter, which must be one of the users allowed */
export function optionalUser(
  params: StatisticsGraphParams,
  access: StatisticsGraphAccess,
): string | null {
  const user = optionalString(params, 'user');
  if (user !== null && access.users && !access.users.has(user)) {
    throw new ForbiddenException(`Access to user '${user}' denied`);
  }
  return user;
}

/**
 * Value of the 'organization' parameter selecting all the academies
 * (org_names.akademie = TRUE) instead of one organization
 */
export const ALL_ACADEMIES = '__academies__';

/**
 * Optional 'organization' parameter, which must be one of those allowed.
 * ALL_ACADEMIES is allowed only to users not limited in organizations.
 */
export function optionalOrganization(
  params: StatisticsGraphParams,
  access: StatisticsGraphAccess,
): string | null {
  const organization = optionalString(params, 'organization');
  if (
    organization !== null &&
    access.organizations &&
    (organization === ALL_ACADEMIES ||
      !access.organizations.includes(organization))
  ) {
    throw new ForbiddenException(
      `Access to organization '${organization}' denied`,
    );
  }
  return organization;
}

/**
 * Condition limiting jobs of acct_pbs_record `job` to those that ran on the
 * clusters in the text[] parameter `param` (NULL = no limit), through the
 * hosts that belonged to the cluster at the job start.
 *
 * @param job alias of acct_pbs_record (fixed code, never request input)
 * @param param placeholder number of the cluster list
 * @param hostLog alias of acct_hosts_logs joined by the query - limits the
 *   row's host instead of the whole job (for queries counting per host)
 */
export function jobOnClusters(
  job: string,
  param: number,
  hostLog?: string,
): string {
  const hostCondition = hostLog
    ? `cl.acct_host_id = ${hostLog}.acct_host_id
        AND cl.acct_id_string = ${hostLog}.acct_id_string`
    : `cl.acct_id_string = ${job}.acct_id_string`;
  return `
    ($${param}::text[] IS NULL OR EXISTS (
      SELECT 1
      FROM acct_hosts_logs cl
      JOIN physical_virtual_rel cfvr ON cfvr.acct_host_id = cl.acct_host_id
      JOIN physical_hosts_resources_rel cphrr ON cphrr.ph_hosts_id = cfvr.ph_id
      JOIN physical_resources cpr ON cpr.id = cphrr.ph_resources_id
      WHERE ${hostCondition}
        AND cpr.name = ANY($${param}::text[])
        AND cphrr.start_time < to_timestamp(${job}.start_time)
        AND to_timestamp(${job}.start_time) < cphrr.end_time
    ))
  `;
}

// --- chart shape helpers ------------------------------------------------------

/**
 * Builds the chart selected by the 'shape' parameter. `charts` maps every
 * shape the graph offers (the values of its shape field in the frontend) to
 * the builder of that chart; other shapes are rejected. To offer a new chart
 * shape, add its builder to `charts` and the shape to the graph's shape field.
 */
function selectChart<T extends string>(
  params: StatisticsGraphParams,
  charts: Record<T, () => ChartSpec>,
): ChartSpec {
  const shape = requireOneOf(params, 'shape', Object.keys(charts) as T[]);
  return charts[shape]();
}

/**
 * Builders of the vertical ('barVertical') and horizontal ('barHorizontal')
 * bar chart, for selectChart()
 */
function barCharts(
  chart: Omit<BarChart, 'orientation'>,
): Record<'barVertical' | 'barHorizontal', () => ChartSpec> {
  return {
    barVertical: () => barChart({ ...chart, orientation: 'vertical' }),
    barHorizontal: () => barChart({ ...chart, orientation: 'horizontal' }),
  };
}

// --- job duration histograms (queue wait time / run time) ---------------------

/** Duration interval in seconds: from <= duration < to */
interface DurationBucket {
  from: number;
  to: number;
  label: string;
}

const WAIT_TIME_BUCKETS: DurationBucket[] = [
  { from: 0, to: 10, label: '0-10s' },
  { from: 10, to: 30, label: '10-30s' },
  { from: 30, to: 60, label: '30-60s' },
  { from: 60, to: 300, label: '1-5 min' },
  { from: 300, to: 600, label: '5-10 min' },
  { from: 600, to: 1200, label: '10-20 min' },
  { from: 1200, to: 1800, label: '20-30 min' },
  { from: 1800, to: 3600, label: '30-60 min' },
  { from: 3600, to: 7200, label: '1-2 hours' },
  { from: 7200, to: 18000, label: '2-5 hours' },
  { from: 18000, to: 36000, label: '5-10 hours' },
  { from: 36000, to: 86400, label: '10-24 hours' },
  { from: 86400, to: 172800, label: '1-2 days' },
  { from: 172800, to: 432000, label: '2-5 days' },
  { from: 432000, to: 864000, label: '5-10 days' },
  { from: 864000, to: 1728000, label: '10-20 days' },
  { from: 1728000, to: 2592000, label: '20-30 days' },
  { from: 2592000, to: 7776000, label: '30-90 days' },
];

// Slightly wider limits around 2 hours and 24 hours than for the wait time,
// so that jobs hitting the usual walltimes (plus a short overhead) fall into
// the lower bucket
const RUN_TIME_BUCKETS: DurationBucket[] = [
  { from: 0, to: 10, label: '0-10s' },
  { from: 10, to: 30, label: '10-30s' },
  { from: 30, to: 60, label: '30-60s' },
  { from: 60, to: 300, label: '1-5 min' },
  { from: 300, to: 600, label: '5-10 min' },
  { from: 600, to: 1200, label: '10-20 min' },
  { from: 1200, to: 1800, label: '20-30 min' },
  { from: 1800, to: 3600, label: '30-60 min' },
  { from: 3600, to: 7350, label: '1-2 hours' },
  { from: 7350, to: 18000, label: '2-5 hours' },
  { from: 18000, to: 36000, label: '5-10 hours' },
  { from: 36000, to: 86550, label: '10-24 hours' },
  { from: 86550, to: 172800, label: '1-2 days' },
  { from: 172800, to: 432000, label: '2-5 days' },
  { from: 432000, to: 864000, label: '5-10 days' },
  { from: 864000, to: 1728000, label: '10-20 days' },
  { from: 1728000, to: 2592000, label: '20-30 days' },
  { from: 2592000, to: 7776000, label: '30-90 days' },
];

/**
 * Histogram of job durations in a queue: number of jobs running in the
 * period per duration bucket. Params: queue, period { from, to } (required),
 * shape ('barVertical' | 'barHorizontal' | 'pie'), omitShortBar (drops the
 * first, 0-10s bucket).
 *
 * @param durationSql SQL expression of the duration over acct_pbs_record `p`
 *   (fixed code, never request input)
 */
function jobDurationHistogram(
  durationSql: string,
  buckets: DurationBucket[],
  chartTitle: string,
): StatisticsGraphQuery {
  const selectedBuckets = (params: StatisticsGraphParams) =>
    optionalBoolean(params, 'omitShortBar') ? buckets.slice(1) : buckets;

  return {
    sql: `
      WITH buckets AS (
        SELECT *
        FROM unnest($4::bigint[], $5::bigint[], $6::text[])
          WITH ORDINALITY AS b(time_from, time_to, label, position)
      ),
      jobs AS (
        SELECT ${durationSql} AS duration
        FROM acct_pbs_record p
        JOIN ci_acct_pbs_server s
          ON p.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
        JOIN acct_user au ON p.acct_user_id = au.acct_user_id
        WHERE p.start_time <= extract(epoch from $2::timestamp)
          AND p.end_time >= extract(epoch from $1::timestamp)
          AND p.queue = $3
          AND ${jobOnClusters('p', 7)}
      )
      SELECT b.label, b.time_from, b.time_to, count(j.duration) AS jobs
      FROM buckets b
      LEFT JOIN jobs j
        ON j.duration >= b.time_from AND j.duration < b.time_to
      GROUP BY b.position, b.label, b.time_from, b.time_to
      ORDER BY b.position
    `,
    values: (params, access) => {
      const [from, to] = requireDateRange(params, 'period');
      const selected = selectedBuckets(params);
      return [
        from,
        to,
        requireString(params, 'queue'),
        selected.map((bucket) => bucket.from),
        selected.map((bucket) => bucket.to),
        selected.map((bucket) => bucket.label),
        access.clusters,
      ];
    },
    chart: (rows, params) => {
      const [from, to] = requireDateRange(params, 'period');
      const chart = {
        title: `${requireString(params, 'queue')}: ${chartTitle}`,
        subtitle: `${formatDay(from)} – ${formatDay(to)}`,
        labels: rows.map((row) =>
          typeof row.label === 'string' ? row.label : '',
        ),
        values: rows.map((row) => toNumber(row.jobs)),
      };
      return selectChart(params, {
        ...barCharts({ ...chart, valueLabel: 'Jobs', color: '#e8001c' }),
        pie: () => pieChart(chart),
      });
    },
  };
}

// --- organization / user rankings --------------------------------------------

/** Label of all the academies grouped together (groupAcademies parameter) */
const ACADEMIES_LABEL = 'AV ČR';

/**
 * Organization label of org_names `org`: its name, or ACADEMIES_LABEL for
 * the academies when the boolean parameter `param` (groupAcademies) is set
 *
 * @param org alias of org_names (fixed code, never request input)
 * @param param placeholder number of the groupAcademies flag
 */
const ORGANIZATION_LABEL = (org: string, param: number) => `
  CASE
    WHEN $${param}::boolean AND ${org}.akademie = TRUE THEN '${ACADEMIES_LABEL}'
    ELSE ${org}.name
  END
`;

/**
 * Params of the organization rankings: period { from, to } (required), an
 * optional organization (org_names.name, empty = all organizations) and
 * groupAcademies (all the academies as one organization).
 * Returns [from, to, organization | null, clusters | null, groupAcademies]
 * for $1-$5.
 */
function rankingValues(
  params: StatisticsGraphParams,
  access: StatisticsGraphAccess,
): unknown[] {
  return [
    ...requireDateRange(params, 'period'),
    optionalOrganization(params, access),
    access.clusters,
    optionalBoolean(params, 'groupAcademies'),
  ];
}

/** Bar or pie chart of a ranking (one bar / slice per row) */
function rankingChart(
  chartTitle: string,
  labelColumn: string,
  valueColumn: string,
  valueLabel: string,
): NonNullable<StatisticsGraphQuery['chart']> {
  return (rows, params) => {
    const [from, to] = requireDateRange(params, 'period');
    const scope = [
      optionalString(params, 'user'),
      organizationLabel(optionalString(params, 'organization')),
      `${formatDay(from)} – ${formatDay(to)}`,
    ];
    const chart = {
      title: chartTitle,
      subtitle: scope.filter(Boolean).join(', '),
      labels: rows.map((row) => {
        const label = row[labelColumn];
        return typeof label === 'string' ? label : 'Unknown';
      }),
      values: rows.map((row) => toNumber(row[valueColumn])),
    };
    return selectChart(params, {
      ...barCharts({ ...chart, valueLabel, color: '#e8001c' }),
      pie: () => pieChart({ ...chart, maxSlices: 15 }),
    });
  };
}

/** Chart subtitle of the 'organization' parameter */
function organizationLabel(organization: string | null): string {
  if (organization === null) {
    return 'All organizations';
  }
  return organization === ALL_ACADEMIES ? 'All the Czech Academies' : organization;
}

/**
 * Condition on org_names `org` matching the organization in $3: the
 * organization name, or all the academies for ALL_ACADEMIES (NULL = any)
 */
const ORG_MATCHES = (org: string) => `
  ($3::text IS NULL
    OR ${org}.name = $3
    OR ($3 = '${ALL_ACADEMIES}' AND ${org}.akademie = TRUE))
`;

/** Condition on acct_user `au` limiting users to the organization in $3 */
const USER_IN_ORGANIZATION = `
  ($3::text IS NULL OR au.organisation IN (
    SELECT org.user_org FROM org_names org WHERE ${ORG_MATCHES('org')}
  ))
`;

/** Condition on acct_user `au` limiting users to the user name in $4 */
const USER_NAME = `($4::text IS NULL OR au.user_name = $4)`;

/**
 * Ranking params plus an optional user:
 * [from, to, organization, user, clusters] for $1-$5
 */
function rankingValuesWithUser(
  params: StatisticsGraphParams,
  access: StatisticsGraphAccess,
): unknown[] {
  return [
    ...requireDateRange(params, 'period'),
    optionalOrganization(params, access),
    optionalUser(params, access),
    access.clusters,
  ];
}

/** Job time of acct_pbs_record `j` in seconds, clipped to the period $1-$2 */
const JOB_TIME_IN_PERIOD = `
  LEAST(j.end_time, extract(epoch from $2::timestamp))
  - GREATEST(j.start_time, extract(epoch from $1::timestamp))
`;

/** Jobs of acct_pbs_record `j` running in the period $1-$2 */
const JOB_IN_PERIOD = `
  j.start_time <= extract(epoch from $2::timestamp)
  AND j.end_time >= extract(epoch from $1::timestamp)
`;

/**
 * Queue name of job `j` on PBS server `s`: queue@server (short host name),
 * just the queue on the skirit-f server
 */
const QUEUE_LABEL = `
  j.queue || CASE
    WHEN s.hostname ~ 'skirit-f' THEN ''
    ELSE '@' || split_part(s.hostname, '.', 1)
  END
`;

/**
 * Jobs `j` of users `au` with the physical resources (clusters) `pr` they
 * ran on, through the hosts that belonged to the resource at the job start
 */
const CLUSTER_JOBS_FROM = `
  FROM physical_resources pr
  JOIN physical_hosts_resources_rel phrr ON pr.id = phrr.ph_resources_id
  JOIN physical_hosts ph ON phrr.ph_hosts_id = ph.id
  JOIN physical_virtual_rel fvr ON ph.id = fvr.ph_id
  JOIN acct_host ah ON fvr.acct_host_id = ah.acct_host_id
  JOIN acct_hosts_logs l ON ah.acct_host_id = l.acct_host_id
  JOIN acct_pbs_record j
    ON l.acct_id_string = j.acct_id_string
    AND phrr.start_time < to_timestamp(j.start_time)
    AND to_timestamp(j.start_time) < phrr.end_time
  JOIN acct_user au ON j.acct_user_id = au.acct_user_id
  JOIN ci_acct_pbs_server s ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
`;

// --- graph queries ------------------------------------------------------------

export const STATISTICS_GRAPH_QUERIES: Record<string, StatisticsGraphQuery> = {
  // Usage of a specific cluster
  // Daily workload of the cluster in the period, limited to the days when
  // the cluster was enabled. Params: cluster, period { from, to } - all required.
  clusterUsage: {
    sql: `
      SELECT w.*
      FROM physical_resources pr
      JOIN workload w ON pr.id = w.ph_resources_id
      WHERE pr.name = $1
        AND (pr.enabled_time IS NOT NULL OR pr.disabled_time IS NOT NULL)
        AND w.day >= $2::date
        AND w.day <= $3::date
        AND (pr.enabled_time IS NULL OR w.day >= pr.enabled_time)
        AND (pr.disabled_time IS NULL OR w.day <= pr.disabled_time)
      ORDER BY w.day
    `,
    values: (params, access) => [
      requireCluster(params, access),
      ...requireDateRange(params, 'period'),
    ],
    chart: (rows, params) => {
      const [from, to] = requireDateRange(params, 'period');
      const chart = {
        title: requireString(params, 'cluster'),
        subtitle: `${formatDay(from)} – ${formatDay(to)}`,
        yLabel: '%',
        yMax: 100,
        xLabels: rows.map((row) => toDay(row.day)),
        series: [
          {
            label: 'Jobs',
            color: '#e8001c',
            values: rows.map((row) => toNumber(row.jobs_ratio)),
          },
          {
            label: 'Reserved',
            color: '#1f3fff',
            values: rows.map((row) => toNumber(row.reserved_ratio)),
          },
          {
            label: 'Maintenance',
            color: '#22e022',
            values: rows.map((row) => toNumber(row.maintenance_ratio)),
          },
        ],
      };
      return selectChart(params, {
        area: () => ({ option: timeSeriesChart({ ...chart, kind: 'area' }) }),
        line: () => ({ option: timeSeriesChart({ ...chart, kind: 'line' }) }),
      });
    },
  },

  // Average usage of all clusters
  // Average utilization of each physical resource over the days in the period
  // when it was enabled, one row per resource; resources with zero (or no)
  // utilization are left out. Params: period { from, to },
  // shape ('barVertical' | 'barHorizontal').
  averageUsage: {
    sql: `
      SELECT
        w.ph_resources_id,
        pr.name,
        ROUND(AVG(w.utilization_ratio)::numeric, 1) AS avg_utilization
      FROM physical_resources pr
      JOIN workload w ON pr.id = w.ph_resources_id
      WHERE (pr.enabled_time IS NOT NULL OR pr.disabled_time IS NOT NULL)
        AND w.day >= $1::date
        AND w.day <= $2::date
        AND (pr.enabled_time IS NULL OR w.day >= pr.enabled_time)
        AND (pr.disabled_time IS NULL OR w.day <= pr.disabled_time)
        AND ($3::text[] IS NULL OR pr.name = ANY($3::text[]))
      GROUP BY w.ph_resources_id, pr.name
      HAVING ROUND(AVG(w.utilization_ratio)::numeric, 1) > 0
      ORDER BY avg_utilization DESC, pr.name
    `,
    values: (params, access) => [
      ...requireDateRange(params, 'period'),
      access.clusters,
    ],
    chart: (rows, params) => {
      const [from, to] = requireDateRange(params, 'period');
      return selectChart(
        params,
        barCharts({
          title: 'Average utilization',
          subtitle: `${formatDay(from)} – ${formatDay(to)}`,
          valueLabel: '%',
          valueMax: 100,
          color: '#e8001c',
          labels: rows.map((row) =>
            typeof row.name === 'string' ? row.name : '',
          ),
          values: rows.map((row) => toNumber(row.avg_utilization)),
        }),
      );
    },
  },

  // Cluster usage by organizations
  // Hours computed by jobs on the cluster's hosts in the period, per user
  // organization. Job time is clipped to the period. Params: cluster,
  // period { from, to } (required),
  // shape ('barVertical' | 'barHorizontal' | 'pie'), groupAcademies (all the
  // academies as one organization).
  clusterOrganizations: {
    sql: `
      SELECT
        pr.name AS cluster,
        ${ORGANIZATION_LABEL('org', 4)} AS organization,
        ROUND(
          SUM(
            LEAST(j.end_time, extract(epoch from $3::timestamp))
            - GREATEST(j.start_time, extract(epoch from $2::timestamp))
          )::numeric / 3600,
          1
        ) AS hours
      FROM physical_resources pr
      JOIN physical_hosts_resources_rel phrr ON phrr.ph_resources_id = pr.id
      JOIN physical_hosts ph ON ph.id = phrr.ph_hosts_id
      JOIN physical_virtual_rel fvr ON fvr.ph_id = ph.id
      JOIN acct_host ah ON ah.acct_host_id = fvr.acct_host_id
      JOIN acct_hosts_logs l ON l.acct_host_id = ah.acct_host_id
      JOIN acct_pbs_record j ON j.acct_id_string = l.acct_id_string
      JOIN acct_user au ON au.acct_user_id = j.acct_user_id
      LEFT JOIN org_names org ON org.user_org = au.organisation
      WHERE pr.name = $1
        AND j.start_time <= extract(epoch from $3::timestamp)
        AND j.end_time >= extract(epoch from $2::timestamp)
        AND phrr.start_time < to_timestamp(j.start_time)
        AND to_timestamp(j.start_time) < phrr.end_time
      GROUP BY 1, 2
      ORDER BY hours DESC
    `,
    values: (params, access) => [
      requireCluster(params, access),
      ...requireDateRange(params, 'period'),
      optionalBoolean(params, 'groupAcademies'),
    ],
    chart: (rows, params) => {
      const [from, to] = requireDateRange(params, 'period');
      const chart = {
        title: `${requireString(params, 'cluster')}: usage by organizations`,
        subtitle: `${formatDay(from)} – ${formatDay(to)}`,
        labels: rows.map((row) =>
          typeof row.organization === 'string' ? row.organization : 'Unknown',
        ),
        values: rows.map((row) => toNumber(row.hours)),
      };
      return selectChart(params, {
        ...barCharts({ ...chart, valueLabel: 'Hours', color: '#e8001c' }),
        pie: () => pieChart({ ...chart, maxSlices: 15 }),
      });
    },
  },

  // Job wait time before start in a queue (start_time - create_time)
  queueWaitTime: jobDurationHistogram(
    'p.start_time - p.create_time',
    WAIT_TIME_BUCKETS,
    'job wait time before start',
  ),

  // Job run time in a queue (end_time - start_time)
  queueRunTime: jobDurationHistogram(
    'p.end_time - p.start_time',
    RUN_TIME_BUCKETS,
    'job run time',
  ),
  // Organizations by job time
  // Hours of jobs running in the period per organization (counted per host
  // the job ran on, not clipped to the period). Params: period { from, to }
  // (required), organization (optional),
  // shape ('barVertical' | 'barHorizontal' | 'pie'), groupAcademies.
  organizationsByJobTime: {
    sql: `
      SELECT
        ${ORGANIZATION_LABEL('org', 5)} AS organization,
        ROUND(SUM(j.end_time - j.start_time)::numeric / 3600, 2) AS hours
      FROM acct_pbs_record j
      JOIN ci_acct_pbs_server s
        ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
      JOIN acct_hosts_logs l ON j.acct_id_string = l.acct_id_string
      JOIN acct_host h ON l.acct_host_id = h.acct_host_id
      JOIN acct_user u ON j.acct_user_id = u.acct_user_id
      LEFT JOIN org_names org ON u.organisation = org.user_org
      WHERE j.start_time <= extract(epoch from $2::timestamp)
        AND j.end_time >= extract(epoch from $1::timestamp)
        AND ${ORG_MATCHES('org')}
        AND ${jobOnClusters('j', 4, 'l')}
      GROUP BY 1
      ORDER BY hours DESC NULLS LAST, organization
    `,
    values: rankingValues,
    chart: rankingChart(
      'Organizations by job time',
      'organization',
      'hours',
      'Hours',
    ),
  },

  // Organizations by number of jobs
  // Params: period { from, to } (required), organization (optional),
  // shape ('barVertical' | 'barHorizontal' | 'pie'), groupAcademies.
  organizationsByJobCount: {
    sql: `
      SELECT ${ORGANIZATION_LABEL('org', 5)} AS organization, count(*) AS jobs
      FROM acct_pbs_record j
      JOIN ci_acct_pbs_server s
        ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
      JOIN acct_user u ON j.acct_user_id = u.acct_user_id
      LEFT JOIN org_names org ON u.organisation = org.user_org
      WHERE j.end_time >= extract(epoch from $1::timestamp)
        AND j.start_time <= extract(epoch from $2::timestamp)
        AND ${ORG_MATCHES('org')}
        AND ${jobOnClusters('j', 4)}
      GROUP BY 1
      ORDER BY jobs DESC, organization
    `,
    values: rankingValues,
    chart: rankingChart(
      'Organizations by number of jobs',
      'organization',
      'jobs',
      'Jobs',
    ),
  },

  // Users by job time
  // Hours of jobs running in the period, top 60 users. Params:
  // period { from, to } (required), organization and user (optional, empty
  // = all), shape ('barVertical' | 'barHorizontal' | 'pie').
  usersByJobTime: {
    sql: `
      SELECT
        au.user_name,
        ROUND(SUM(j.end_time - j.start_time)::numeric / 3600, 2) AS hours
      FROM acct_pbs_record j
      JOIN ci_acct_pbs_server s
        ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
      JOIN acct_user au ON j.acct_user_id = au.acct_user_id
      WHERE j.end_time > extract(epoch from $1::timestamp)
        AND j.start_time < extract(epoch from $2::timestamp)
        AND ${USER_IN_ORGANIZATION}
        AND ${USER_NAME}
        AND ${jobOnClusters('j', 5)}
      GROUP BY au.user_name
      ORDER BY hours DESC NULLS LAST, au.user_name
      LIMIT 60
    `,
    values: rankingValuesWithUser,
    chart: rankingChart('Users by job time', 'user_name', 'hours', 'Hours'),
  },

  // Users by number of jobs
  // Top 60 users by the number of jobs running in the period. Params:
  // period { from, to } (required), organization and user (optional, empty
  // = all), shape ('barVertical' | 'barHorizontal' | 'pie').
  usersByJobCount: {
    sql: `
      SELECT au.user_name, count(*) AS jobs
      FROM acct_pbs_record j
      JOIN ci_acct_pbs_server s
        ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
      JOIN acct_user au ON j.acct_user_id = au.acct_user_id
      WHERE j.end_time > extract(epoch from $1::timestamp)
        AND j.start_time < extract(epoch from $2::timestamp)
        AND ${USER_IN_ORGANIZATION}
        AND ${USER_NAME}
        AND ${jobOnClusters('j', 5)}
      GROUP BY au.user_name
      ORDER BY jobs DESC, au.user_name
      LIMIT 60
    `,
    values: rankingValuesWithUser,
    chart: rankingChart('Users by number of jobs', 'user_name', 'jobs', 'Jobs'),
  },
  // Queues by number of jobs
  // Jobs running in the period per queue@server. Params: period { from, to }
  // (required), organization and user (optional, empty = all),
  // shape ('barVertical' | 'barHorizontal' | 'pie').
  queuesByJobCount: {
    sql: `
      SELECT ${QUEUE_LABEL} AS queue, count(*) AS jobs
      FROM acct_pbs_record j
      JOIN ci_acct_pbs_server s
        ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
      JOIN acct_user au ON j.acct_user_id = au.acct_user_id
      WHERE ${JOB_IN_PERIOD}
        AND ${USER_IN_ORGANIZATION}
        AND ${USER_NAME}
        AND ${jobOnClusters('j', 5)}
      GROUP BY 1
      ORDER BY jobs DESC, queue
    `,
    values: rankingValuesWithUser,
    chart: rankingChart('Queues by number of jobs', 'queue', 'jobs', 'Jobs'),
  },

  // Queues by computed time
  // CPU hours (job time clipped to the period x used CPUs) per queue@server.
  // Params: period { from, to } (required), organization and user (optional,
  // empty = all), shape ('barVertical' | 'barHorizontal' | 'pie').
  queuesByComputedTime: {
    sql: `
      SELECT
        ${QUEUE_LABEL} AS queue,
        ROUND(SUM((${JOB_TIME_IN_PERIOD}) * j.used_ncpus)::numeric / 3600, 1)
          AS cpu_hours
      FROM acct_pbs_record j
      JOIN ci_acct_pbs_server s
        ON j.ci_acct_pbs_server_id = s.ci_acct_pbs_server_id
      JOIN acct_user au ON j.acct_user_id = au.acct_user_id
      WHERE ${JOB_IN_PERIOD}
        AND ${USER_IN_ORGANIZATION}
        AND ${USER_NAME}
        AND ${jobOnClusters('j', 5)}
      GROUP BY 1
      ORDER BY cpu_hours DESC NULLS LAST, queue
    `,
    values: rankingValuesWithUser,
    chart: rankingChart(
      'Queues by computed time',
      'queue',
      'cpu_hours',
      'CPU hours',
    ),
  },

  // Clusters by computed time
  // Hours of jobs (clipped to the period, counted per host) per physical
  // resource. Params: period { from, to } (required), organization and user
  // (optional, empty = all), shape ('barVertical' | 'barHorizontal' | 'pie').
  clustersByComputedTime: {
    sql: `
      SELECT
        pr.name,
        ROUND(SUM(${JOB_TIME_IN_PERIOD})::numeric / 3600, 1) AS hours
      ${CLUSTER_JOBS_FROM}
      WHERE ${JOB_IN_PERIOD}
        AND ${USER_IN_ORGANIZATION}
        AND ${USER_NAME}
        AND ($5::text[] IS NULL OR pr.name = ANY($5::text[]))
      GROUP BY pr.name
      ORDER BY hours DESC NULLS LAST, pr.name
    `,
    values: rankingValuesWithUser,
    chart: rankingChart('Clusters by computed time', 'name', 'hours', 'Hours'),
  },

  // Clusters by number of jobs
  // Distinct jobs per physical resource. Params: period { from, to }
  // (required), organization and user (optional, empty = all),
  // shape ('barVertical' | 'barHorizontal' | 'pie').
  clustersByJobCount: {
    sql: `
      SELECT pr.name, count(DISTINCT j.acct_id_string) AS jobs
      ${CLUSTER_JOBS_FROM}
      WHERE ${JOB_IN_PERIOD}
        AND ${USER_IN_ORGANIZATION}
        AND ${USER_NAME}
        AND ($5::text[] IS NULL OR pr.name = ANY($5::text[]))
      GROUP BY pr.name
      ORDER BY jobs DESC, pr.name
    `,
    values: rankingValuesWithUser,
    chart: rankingChart('Clusters by number of jobs', 'name', 'jobs', 'Jobs'),
  },
};

/** Returns the query of the graph, throws NotFoundException for unknown ids */
export function getStatisticsGraphQuery(graphId: string): StatisticsGraphQuery {
  if (!Object.hasOwn(STATISTICS_GRAPH_QUERIES, graphId)) {
    throw new NotFoundException(`Unknown statistics graph '${graphId}'`);
  }
  return STATISTICS_GRAPH_QUERIES[graphId];
}
