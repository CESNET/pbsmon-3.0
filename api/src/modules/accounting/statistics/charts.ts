import * as echarts from 'echarts';
import type { EChartsOption, LineSeriesOption } from 'echarts';

/**
 * Server-side chart rendering for statistics graphs, based on Apache ECharts
 * (https://echarts.apache.org). Any ECharts option (line, bar, pie, ...) can be
 * rendered to SVG; helpers below build options for common graph types.
 */

/** Chart of a statistics graph: an ECharts option plus the image size */
export interface ChartSpec {
  option: EChartsOption;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 340;
const FONT_FAMILY = 'Helvetica, Arial, sans-serif';

/** Renders the chart to a standalone SVG document */
export function renderChartSvg(spec: ChartSpec): string {
  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: spec.width ?? DEFAULT_WIDTH,
    height: spec.height ?? DEFAULT_HEIGHT,
  });
  try {
    chart.setOption({
      animation: false,
      backgroundColor: '#fff',
      textStyle: { fontFamily: FONT_FAMILY },
      ...spec.option,
    });
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

// --- value helpers ------------------------------------------------------------

/** Number from a DB value (numeric columns come as strings), invalid -> 0 */
export function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/** YYYY-MM-DD from a DB date (string) or timestamp (Date) value */
export function toDay(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

/** YYYY-MM-DD -> DD.MM.YYYY */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-');
  return d && m && y ? `${d}.${m}.${y}` : day;
}

// --- option builders ----------------------------------------------------------

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

export interface TimeSeriesChart {
  title: string;
  subtitle?: string;
  /** Name of the Y axis, e.g. '%' */
  yLabel?: string;
  /** One label per data point (typically YYYY-MM-DD) */
  xLabels: string[];
  /** Area charts stack the series bottom-up in the given order */
  series: ChartSeries[];
  kind: 'area' | 'line';
  /** Fixed Y axis maximum (e.g. 100 for percentages), computed when not set */
  yMax?: number;
}

/** Area (stacked) or line chart of values over days */
export function timeSeriesChart(chart: TimeSeriesChart): EChartsOption {
  const isArea = chart.kind === 'area';
  const series: LineSeriesOption[] = chart.series.map((s) => ({
    type: 'line',
    name: s.label,
    data: s.values,
    color: s.color,
    showSymbol: false,
    lineStyle: { width: isArea ? 0 : 1.5 },
    ...(isArea ? { stack: 'total', areaStyle: { opacity: 1 } } : {}),
  }));

  return {
    title: {
      text: chart.title,
      subtext: chart.subtitle,
      left: 'center',
      top: 4,
      itemGap: 4,
    },
    legend: {
      top: 46,
      left: 'center',
      icon: 'rect',
      itemWidth: 12,
      itemHeight: 10,
    },
    grid: { left: 50, right: 20, top: 85, bottom: 80 },
    xAxis: {
      type: 'category',
      data: chart.xLabels,
      boundaryGap: false,
      axisLabel: { rotate: 90 },
    },
    yAxis: {
      type: 'value',
      name: chart.yLabel,
      min: 0,
      max: chart.yMax,
      splitNumber: 10,
    },
    series,
  };
}

export interface BarChart {
  title: string;
  subtitle?: string;
  /** Name of the value axis, e.g. '%' */
  valueLabel?: string;
  /** Fixed maximum of the value axis, computed when not set */
  valueMax?: number;
  color: string;
  /** One category (bar) per label, in display order */
  labels: string[];
  values: number[];
  /**
   * 'vertical' (default): categories side by side along the X axis, bars go up.
   * 'horizontal': categories listed down the Y axis, bars go right.
   */
  orientation?: 'vertical' | 'horizontal';
}

/** Space per bar; the image grows with the number of categories */
const BAR_SIZE = 18;

/** Bar chart, one bar per category with its value shown at the bar end */
export function barChart(chart: BarChart): ChartSpec {
  const count = Math.max(1, chart.labels.length);
  const title = {
    text: chart.title,
    subtext: chart.subtitle,
    left: 'center',
    top: 4,
    itemGap: 4,
  };
  const valueAxis = {
    type: 'value' as const,
    name: chart.valueLabel,
    min: 0,
    max: chart.valueMax,
    splitNumber: 10,
  };
  const series = {
    type: 'bar' as const,
    data: chart.values,
    color: chart.color,
    barMaxWidth: BAR_SIZE - 4,
  };

  if (chart.orientation === 'horizontal') {
    const top = 60;
    const bottom = 40;
    return {
      height: top + bottom + count * BAR_SIZE,
      option: {
        title,
        grid: { left: 10, right: 50, top, bottom, containLabel: true },
        xAxis: valueAxis,
        // First label at the top
        yAxis: {
          type: 'category',
          data: chart.labels,
          inverse: true,
          axisLabel: { interval: 0 },
        },
        series: [
          { ...series, label: { show: true, position: 'right', fontSize: 10 } },
        ],
      },
    };
  }

  return {
    width: Math.max(DEFAULT_WIDTH, 80 + count * BAR_SIZE),
    height: 640,
    option: {
      title,
      // Fit axis labels and names into the image
      grid: {
        left: 10,
        right: 20,
        top: 85,
        bottom: 10,
        outerBoundsMode: 'same',
        outerBoundsContain: 'all',
      },
      xAxis: {
        type: 'category',
        data: chart.labels,
        axisLabel: { interval: 0, rotate: 90 },
      },
      // Axis name on the left side, the value labels above bars need the top
      yAxis: {
        ...valueAxis,
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 10,
        nameMoveOverlap: true,
      },
      series: [
        {
          ...series,
          label: {
            show: true,
            position: 'top',
            fontSize: 9,
            rotate: 90,
            align: 'left',
            verticalAlign: 'middle',
            distance: 4,
          },
        },
      ],
    },
  };
}

export interface PieChart {
  title: string;
  subtitle?: string;
  /** One slice per label, empty (zero) slices are left out */
  labels: string[];
  values: number[];
  /**
   * Keep only the largest slices and merge the rest into one "other" slice,
   * so that charts with many categories stay readable
   */
  maxSlices?: number;
  otherLabel?: string;
}

/** Pie chart with labels showing the value and its share in % */
export function pieChart(chart: PieChart): ChartSpec {
  let data = chart.labels
    .map((name, i) => ({ name, value: chart.values[i] ?? 0 }))
    .filter((item) => item.value > 0);

  if (chart.maxSlices && data.length > chart.maxSlices) {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const kept = sorted.slice(0, chart.maxSlices - 1);
    const rest = sorted.slice(chart.maxSlices - 1);
    const restSum = rest.reduce((sum, item) => sum + item.value, 0);
    data = [
      ...kept,
      {
        name: `${chart.otherLabel ?? 'Other'} (${rest.length})`,
        value: Math.round(restSum * 10) / 10,
      },
    ];
  }

  return {
    height: 420,
    option: {
      title: {
        text: chart.title,
        subtext: chart.subtitle,
        left: 'center',
        top: 4,
        itemGap: 4,
      },
      series: [
        {
          type: 'pie',
          center: ['50%', '57%'],
          radius: '62%',
          data,
          label: { formatter: '{b}: {c} ({d}%)', fontSize: 11 },
        },
      ],
    },
  };
}
