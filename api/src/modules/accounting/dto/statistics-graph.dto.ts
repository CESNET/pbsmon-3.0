import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { StatisticsGraphParamType } from '../statistics/statistics-graph-queries';

export class StatisticsGraphRequestDTO {
  @ApiProperty({
    description:
      'Graph parameters as filled in the form (e.g. cluster, period: { from, to }). Which ones are required depends on the graph.',
    type: 'object',
    additionalProperties: true,
  })
  params: Record<string, unknown>;
}

export class StatisticsGraphDataDTO {
  @Expose()
  @ApiProperty({ description: 'Graph identifier' })
  graphId: string;

  @Expose()
  @ApiProperty({ description: 'Column names of the result', type: [String] })
  columns: string[];

  @Expose()
  @ApiProperty({
    description:
      'Result rows, each row has one value per column. Dates are returned as YYYY-MM-DD strings.',
    type: 'array',
    items: { type: 'array', items: {} },
  })
  rows: unknown[][];
}

export class StatisticsGraphChartDTO {
  @Expose()
  @ApiProperty({ description: 'Graph identifier' })
  graphId: string;

  @Expose()
  @ApiProperty({ description: 'Chart as a standalone SVG document' })
  svg: string;
}

export class StatisticsGraphParamDTO {
  @Expose()
  @ApiProperty({ description: 'Parameter name (key in the request params)' })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Parameter type',
    enum: [
      'cluster',
      'queue',
      'organization',
      'user',
      'dateRange',
      'boolean',
      'enum',
    ],
  })
  type: StatisticsGraphParamType;

  @Expose()
  @ApiProperty({ description: 'Whether the parameter is required' })
  required: boolean;

  @Expose()
  @ApiProperty({
    description: 'Parameter is used (and required) only by the chart endpoint',
    required: false,
  })
  chartOnly?: boolean;

  @Expose()
  @ApiProperty({
    description: "Allowed values of an 'enum' parameter",
    type: [String],
    required: false,
  })
  values?: string[];

  @Expose()
  @ApiProperty({
    description: 'API endpoint listing the possible values',
    required: false,
  })
  valuesEndpoint?: string;

  @Expose()
  @ApiProperty({ description: 'Parameter description' })
  description: string;
}

export class StatisticsGraphInfoDTO {
  @Expose()
  @ApiProperty({ description: 'Graph identifier' })
  graphId: string;

  @Expose()
  @ApiProperty({ description: 'Graph name' })
  title: string;

  @Expose()
  @ApiProperty({ description: 'Whether the graph can be rendered as a chart' })
  hasChart: boolean;

  @Expose()
  @ApiProperty({
    description: 'Parameters accepted by the graph',
    type: [StatisticsGraphParamDTO],
  })
  params: StatisticsGraphParamDTO[];
}
